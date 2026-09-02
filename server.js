const http = require('http');
const fs = require('fs');
const path = require('path');
const razorpay = require('./razorpay');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const CAUSES = [
  'bank_timeout',
  'insufficient_funds',
  'expired_card',
  'issuer_decline',
  'checkout_friction',
  'cash_flow_delay',
  'dispute_signal'
];

const labels = {
  bank_timeout: 'Bank timeout',
  insufficient_funds: 'Insufficient funds',
  expired_card: 'Expired card',
  issuer_decline: 'Issuer decline',
  checkout_friction: 'Checkout friction',
  cash_flow_delay: 'Cash-flow delay',
  dispute_signal: 'Dispute signal'
};

const actionLedger = new Map();

function loadEnvFile() {
  const file = path.join(ROOT, '.env');

  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);

    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

loadEnvFile();

function rng(seed) {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

function makeRecord(random, index) {
  const cause = pick(random, CAUSES);

  const kind =
    cause === 'cash_flow_delay' || cause === 'dispute_signal'
      ? 'Invoice overdue'
      : cause === 'checkout_friction'
        ? 'Checkout abandoned'
        : 'Payment failed';

  const method =
    kind === 'Invoice overdue'
      ? 'Netbanking'
      : cause === 'expired_card' ||
          cause === 'issuer_decline' ||
          cause === 'insufficient_funds'
        ? 'Card'
        : 'UPI';

  const consent = random() > 0.13;

  const attempts =
    random() < 0.12
      ? 2
      : random() < 0.28
        ? 1
        : 0;

  const amount =
    kind === 'Invoice overdue'
      ? 8000 + Math.round((random() * 52000) / 100) * 100
      : 499 + Math.round((random() * 12000) / 100) * 100;

  const issuerUp =
    cause !== 'bank_timeout' || random() > 0.18;

  const invoiceAge =
    kind === 'Invoice overdue'
      ? 4 + Math.floor(random() * 31)
      : 0;

  const telemetry =
    random() < 0.88
      ? cause
      : 'ambiguous_event';

  // Synthetic counterfactual used only for the
  // treatment-vs-control experiment.
  const naturalRecovery =
    random() <
    {
      bank_timeout: 0.18,
      insufficient_funds: 0.08,
      expired_card: 0.06,
      issuer_decline: 0.05,
      checkout_friction: 0.10,
      cash_flow_delay: 0.14,
      dispute_signal: 0.02
    }[cause];

  return {
    id: `${
      kind === 'Payment failed'
        ? 'PAY'
        : kind === 'Checkout abandoned'
          ? 'CHK'
          : 'INV'
    }-${String(1000 + index)}`,

    kind,
    cause,
    method,
    consent,
    attempts,
    amount,
    issuerUp,
    invoiceAge,
    hasDispute: cause === 'dispute_signal',
    telemetry,
    naturalRecovery
  };
}

function features(row) {
  return [
    row.kind,
    row.method,
    String(row.issuerUp),
    row.invoiceAge > 14 ? 'late' : 'current',
    String(row.hasDispute),
    row.telemetry
  ];
}

function train(rows) {
  const model = {
    totals: {},
    counts: {},
    vocabulary: new Set(CAUSES)
  };

  for (const row of rows) {
    model.totals[row.cause] =
      (model.totals[row.cause] || 0) + 1;

    for (const feature of features(row)) {
      const key = `${row.cause}|${feature}`;

      model.counts[key] =
        (model.counts[key] || 0) + 1;
    }
  }

  return model;
}

function predict(model, row) {
  const total = Object.values(model.totals)
    .reduce((a, b) => a + b, 0);

  const scores = CAUSES
    .map(cause => {
      let score =
        Math.log(
          (model.totals[cause] || 0.5) / total
        );

      for (const feature of features(row)) {
        score += Math.log(
          ((model.counts[`${cause}|${feature}`] || 0) + 1) /
          ((model.totals[cause] || 0) + 8)
        );
      }

      return [cause, score];
    })
    .sort((a, b) => b[1] - a[1]);

  const [winner, top] = scores[0];
  const spread = top - scores[1][1];

  return {
    cause: winner,
    confidence: Math.max(
      0.51,
      Math.min(
        0.98,
        0.54 + spread * 0.14
      )
    )
  };
}

function decide(row, prediction) {
  if (!row.consent) {
    return {
      action: 'stop',
      outcome: 'stopped',
      reason: 'Contact consent is absent.'
    };
  }

  if (row.attempts >= 2) {
    return {
      action: 'stop',
      outcome: 'stopped',
      reason:
        'Hard stopping rule: two recovery attempts already used.'
    };
  }

  if (row.hasDispute || prediction.confidence < 0.75) {
    return {
      action: 'review',
      outcome: 'review',
      reason: row.hasDispute
        ? 'Dispute indicator requires human handling.'
        : 'Confidence is below the 75% automation threshold.'
    };
  }

  if (
    prediction.cause === 'bank_timeout' &&
    row.issuerUp
  ) {
    return {
      action: 'retry',
      outcome: 'recovered',
      reason:
        'Issuer is available; one idempotent retry is eligible.'
    };
  }

  if (prediction.cause === 'cash_flow_delay') {
    return {
      action: 'human',
      outcome: 'review',
      reason:
        'A B2B payment plan task is safer than automated outreach.'
    };
  }

  if (prediction.cause === 'issuer_decline') {
    return {
      action: 'review',
      outcome: 'review',
      reason:
        'Issuer-decline recovery is routed to a specialist.'
    };
  }

  return {
    action: 'link',
    outcome: 'recovered',
    reason:
      'One consented secure-payment link is eligible.'
  };
}

function metrics(cases, correct, trainingRows) {
  const truePositive = cases.filter(
    item => item.predictionCause === item.cause
  ).length;

  const byCause = Object.fromEntries(
    CAUSES.map(cause => {
      const actual = cases.filter(
        item => item.cause === cause
      ).length;

      const predicted = cases.filter(
        item => item.predictionCause === cause
      ).length;

      const tp = cases.filter(
        item =>
          item.cause === cause &&
          item.predictionCause === cause
      ).length;

      return [
        cause,
        {
          actual,
          predicted,
          truePositive: tp,
          precision: predicted ? tp / predicted : 0,
          recall: actual ? tp / actual : 0
        }
      ];
    })
  );

  const precision = cases.length
    ? truePositive / cases.length
    : 0;

  const recall = precision;

  const macroPrecision =
    Object.values(byCause)
      .reduce(
        (sum, item) => sum + item.precision,
        0
      ) / CAUSES.length;

  const macroRecall =
    Object.values(byCause)
      .reduce(
        (sum, item) => sum + item.recall,
        0
      ) / CAUSES.length;

  const f1 =
    precision + recall
      ? (2 * precision * recall) /
        (precision + recall)
      : 0;

  const macroF1 =
    macroPrecision + macroRecall
      ? (2 * macroPrecision * macroRecall) /
        (macroPrecision + macroRecall)
      : 0;

  const totalAtRisk = cases.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const recovered = cases
    .filter(item => item.outcome === 'recovered')
    .reduce((sum, item) => sum + item.amount, 0);

  const protectedAmount = cases
    .filter(item => item.outcome === 'stopped')
    .reduce((sum, item) => sum + item.amount, 0);

  const eligible = cases
    .filter(item => item.actionEligible)
    .reduce((sum, item) => sum + item.amount, 0);

  const controlRecovered = cases
    .filter(item => item.naturalRecovery)
    .reduce((sum, item) => sum + item.amount, 0);

  const incremental = Math.max(
    0,
    recovered - controlRecovered
  );

  const lift = controlRecovered
    ? incremental / controlRecovered
    : 0;

  const falsePositiveAmount = cases
    .filter(
      item =>
        item.actionEligible &&
        !item.naturalRecovery
    )
    .reduce(
      (sum, item) => sum + item.amount,
      0
    );

  return {
    trainingRows,
    heldOutRows: cases.length,

    diagnosisAccuracy:
      cases.length ? correct / cases.length : 0,

    precision,
    recall,
    macroPrecision,
    macroRecall,
    f1,
    macroF1,

    confusion: byCause,

    totalAtRisk,
    recovered,
    protectedAmount,
    eligibleRevenue: eligible,

    reviewCount: cases.filter(
      item => item.outcome === 'review'
    ).length,

    stoppedCount: cases.filter(
      item => item.outcome === 'stopped'
    ).length,

    controlRecovered,
    incrementalRecovery: incremental,
    recoveryLift: lift,

    falsePositiveAmount,

    evaluationNote:
      'Control is a synthetic counterfactual: each held-out case carries an independently sampled natural-recovery flag. It is a prototype lift estimate, not a live merchant experiment.'
  };
}

function buildBatch() {
  const trainingRandom = rng(9000);
  const testRandom = rng(3000);
  const outcomeRandom = rng(7000);

  const training = Array.from(
    { length: 500 },
    (_, i) => makeRecord(trainingRandom, i)
  );

  const test = Array.from(
    { length: 240 },
    (_, i) => makeRecord(testRandom, i)
  );

  const model = train(training);
  let correct = 0;

  const cases = test.map(row => {
    const prediction = predict(model, row);

    if (prediction.cause === row.cause) {
      correct += 1;
    }

    const decision = decide(row, prediction);

    const actionSuccessRate =
      decision.action === 'retry'
        ? 0.95
        : decision.action === 'link'
          ? 0.82
          : 0;

    const recoveryConfirmed =
      decision.outcome === 'recovered' &&
      outcomeRandom() < actionSuccessRate;

    const outcome =
      recoveryConfirmed
        ? 'recovered'
        : decision.outcome === 'recovered'
          ? 'unrecovered'
          : decision.outcome;

    const actionText = {
      retry: 'Execute one idempotent retry',
      link: 'Send one secure payment link',
      human: 'Create human recovery task',
      stop: 'Stop — policy guardrail',
      review: 'Route to human review'
    }[decision.action];

    return {
      ...row,

      reason: labels[prediction.cause],
      predictionCause: prediction.cause,
      confidence: prediction.confidence,

      action: decision.action,
      actionText,

      outcome,
      recoveryConfirmed,

      actionEligible:
        decision.outcome === 'recovered',

      decisionReason: decision.reason,

      signal: row.kind
    };
  });

  return {
    cases,
    evaluation: metrics(
      cases,
      correct,
      training.length
    )
  };
}

const batch = buildBatch();

function json(res, body, code = 200) {
  res.writeHead(code, {
    'Content-Type':
      'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });

  res.end(JSON.stringify(body));
}

function safePathFromUrl(urlPath) {
  const requested =
    urlPath === '/'
      ? 'index.html'
      : decodeURIComponent(
          urlPath
        ).replace(/^\/+/, '');

  const file = path.resolve(
    ROOT,
    requested
  );

  const relative = path.relative(
    ROOT,
    file
  );

  // Prevent directory traversal.
  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    return null;
  }

  return file;
}

function serve(req, res) {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );

    // -----------------------------
    // Evaluation APIs
    // -----------------------------

    if (
      req.method === 'GET' &&
      url.pathname === '/api/batch'
    ) {
      return json(res, batch);
    }

    if (
      req.method === 'GET' &&
      url.pathname === '/api/evaluation'
    ) {
      return json(
        res,
        batch.evaluation
      );
    }

    // -----------------------------
    // Razorpay integration status
    // -----------------------------

    if (
      req.method === 'GET' &&
      url.pathname ===
        '/api/integrations/razorpay/status'
    ) {
      const config = razorpay.config();

      return json(res, {
        configured: config.configured,
        testMode: config.testMode,
        liveModeBlocked: true
      });
    }

    // -----------------------------
    // Razorpay payments
    // -----------------------------

    if (
      req.method === 'GET' &&
      url.pathname ===
        '/api/integrations/razorpay/payments'
    ) {
      return razorpay
        .fetchRecentPayments(
          url.searchParams.get('count')
        )
        .then(body =>
          json(res, body)
        )
        .catch(error =>
          json(
            res,
            {
              error: error.message
            },
            400
          )
        );
    }

    // -----------------------------
    // Recovery actions
    // -----------------------------

    if (
      req.method === 'POST' &&
      url.pathname.startsWith('/api/actions/')
    ) {
      const id =
        url.pathname
          .split('/')
          .pop();

      const item =
        batch.cases.find(
          row => row.id === id
        );

      if (!item) {
        return json(
          res,
          {
            error: 'Case not found'
          },
          404
        );
      }

      // Idempotency protection.
      if (actionLedger.has(id)) {
        return json(res, {
          status:
            'duplicate_prevented',
          audit:
            actionLedger.get(id)
        });
      }

      const audit = {
        auditId:
          `AUD-${Date.now()
            .toString(36)
            .toUpperCase()}`,

        caseId: id,

        action: item.action,

        policyDecision:
          item.actionEligible
            ? 'approved'
            : item.outcome,

        outcome: item.outcome,

        createdAt:
          new Date().toISOString(),

        idempotencyKey:
          `recovery_${id}`
      };

      actionLedger.set(
        id,
        audit
      );

      return json(res, {
        status:
          item.actionEligible
            ? 'executed_in_sandbox'
            : 'not_executed_by_policy',

        audit
      });
    }

    // -----------------------------
    // Razorpay recovery links
    // -----------------------------

    if (
      req.method === 'POST' &&
      url.pathname.startsWith(
        '/api/integrations/razorpay/recovery-links/'
      )
    ) {
      const id =
        url.pathname
          .split('/')
          .pop();

      const item =
        batch.cases.find(
          row => row.id === id
        );

      if (!item) {
        return json(
          res,
          {
            error: 'Case not found'
          },
          404
        );
      }

      return razorpay
        .createRecoveryLink(item)
        .then(link =>
          json(res, {
            status:
              'test_link_created',
            id: link.id,
            short_url:
              link.short_url,
            caseId: id
          })
        )
        .catch(error =>
          json(
            res,
            {
              error: error.message
            },
            400
          )
        );
    }

    // -----------------------------
    // Static files / frontend
    // -----------------------------

    const file =
      safePathFromUrl(
        url.pathname
      );

    if (!file) {
      res.writeHead(403, {
        'Content-Type':
          'text/plain; charset=utf-8'
      });

      return res.end(
        'Forbidden'
      );
    }

    fs.readFile(
      file,
      (error, data) => {
        if (error) {
          console.error(
            'Static file error:',
            file,
            error.message
          );

          res.writeHead(404, {
            'Content-Type':
              'text/plain; charset=utf-8'
          });

          return res.end(
            'Not found'
          );
        }

        res.writeHead(200, {
          'Content-Type':
            TYPES[
              path.extname(file)
                .toLowerCase()
            ] ||
            'application/octet-stream'
        });

        res.end(data);
      }
    );
  } catch (error) {
    console.error(
      'Request handling error:',
      error
    );

    return json(
      res,
      {
        error:
          'Internal server error'
      },
      500
    );
  }
}

// IMPORTANT FOR RENDER:
// 0.0.0.0 allows Render's proxy to reach the application.
// PORT comes from Render's environment.
const server =
  http.createServer(serve);

server.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `RecoveryOS running on port ${PORT}`
    );
  }
);

server.on(
  'error',
  error => {
    console.error(
      'Server error:',
      error
    );

    process.exit(1);
  }
);