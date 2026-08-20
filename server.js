/* RecoveryOS local demo server. No external packages or credentials required. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const razorpay = require('./razorpay');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };
const CAUSES = ['bank_timeout', 'insufficient_funds', 'expired_card', 'issuer_decline', 'checkout_friction', 'cash_flow_delay', 'dispute_signal'];
const labels = { bank_timeout: 'Bank timeout', insufficient_funds: 'Insufficient funds', expired_card: 'Expired card', issuer_decline: 'Issuer decline', checkout_friction: 'Checkout friction', cash_flow_delay: 'Cash-flow delay', dispute_signal: 'Dispute signal' };
let actionLedger = new Map();

function loadEnvFile() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim(); }
}
loadEnvFile();

function rng(seed) { let value = seed >>> 0; return () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296); }
function pick(random, values) { return values[Math.floor(random() * values.length)]; }
function makeRecord(random, index) {
  const cause = pick(random, CAUSES);
  const kind = cause === 'cash_flow_delay' || cause === 'dispute_signal' ? 'Invoice overdue' : cause === 'checkout_friction' ? 'Checkout abandoned' : 'Payment failed';
  const method = kind === 'Invoice overdue' ? 'Netbanking' : cause === 'expired_card' || cause === 'issuer_decline' || cause === 'insufficient_funds' ? 'Card' : 'UPI';
  const consent = random() > 0.13;
  const attempts = random() < 0.12 ? 2 : random() < 0.28 ? 1 : 0;
  const amount = kind === 'Invoice overdue' ? 8000 + Math.round(random() * 52000 / 100) * 100 : 499 + Math.round(random() * 12000 / 100) * 100;
  const issuerUp = cause !== 'bank_timeout' || random() > 0.18;
  const invoiceAge = kind === 'Invoice overdue' ? 4 + Math.floor(random() * 31) : 0;
  const telemetry = random() < 0.88 ? cause : 'ambiguous_event';
  return { id: `${kind === 'Payment failed' ? 'PAY' : kind === 'Checkout abandoned' ? 'CHK' : 'INV'}-${String(1000 + index)}`, kind, cause, method, consent, attempts, amount, issuerUp, invoiceAge, hasDispute: cause === 'dispute_signal', telemetry };
}

function features(row) { return [row.kind, row.method, String(row.issuerUp), row.invoiceAge > 14 ? 'late' : 'current', String(row.hasDispute), row.telemetry]; }
function train(rows) {
  const model = { totals: {}, counts: {}, vocabulary: new Set(CAUSES) };
  for (const row of rows) { model.totals[row.cause] = (model.totals[row.cause] || 0) + 1; for (const f of features(row)) { const key = `${row.cause}|${f}`; model.counts[key] = (model.counts[key] || 0) + 1; } }
  return model;
}
function predict(model, row) {
  const scores = CAUSES.map(cause => {
    let score = Math.log((model.totals[cause] || 0.5) / Object.values(model.totals).reduce((a, b) => a + b, 0));
    for (const feature of features(row)) score += Math.log(((model.counts[`${cause}|${feature}`] || 0) + 1) / ((model.totals[cause] || 0) + 8));
    return [cause, score];
  }).sort((a, b) => b[1] - a[1]);
  const [winner, top] = scores[0]; const spread = top - scores[1][1];
  return { cause: winner, confidence: Math.max(0.51, Math.min(0.98, 0.54 + spread * 0.14)) };
}
function decide(row, prediction) {
  if (!row.consent) return { action: 'stop', outcome: 'stopped', reason: 'Contact consent is absent.' };
  if (row.attempts >= 2) return { action: 'stop', outcome: 'stopped', reason: 'Hard stopping rule: two recovery attempts already used.' };
  if (row.hasDispute || prediction.confidence < 0.75) return { action: 'review', outcome: 'review', reason: row.hasDispute ? 'Dispute indicator requires human handling.' : 'Confidence is below the 75% automation threshold.' };
  if (prediction.cause === 'bank_timeout' && row.issuerUp) return { action: 'retry', outcome: 'recovered', reason: 'Issuer is available; one idempotent retry is eligible.' };
  if (prediction.cause === 'cash_flow_delay') return { action: 'human', outcome: 'recovered', reason: 'A B2B payment plan task is safer than automated outreach.' };
  if (prediction.cause === 'issuer_decline') return { action: 'review', outcome: 'review', reason: 'Issuer-decline recovery is routed to a specialist.' };
  return { action: 'link', outcome: 'recovered', reason: 'One consented secure-payment link is eligible.' };
}
function buildBatch() {
  const trainingRandom = rng(9000); const testRandom = rng(3000);
  const training = Array.from({ length: 500 }, (_, i) => makeRecord(trainingRandom, i));
  const test = Array.from({ length: 240 }, (_, i) => makeRecord(testRandom, i));
  const model = train(training); let correct = 0;
  const cases = test.map(row => {
    const prediction = predict(model, row); correct += prediction.cause === row.cause ? 1 : 0;
    const decision = decide(row, prediction);
    const actionText = { retry: 'Execute one idempotent retry', link: 'Send one secure payment link', human: 'Create human recovery task', stop: 'Stop — policy guardrail', review: 'Route to human review' }[decision.action];
    return { ...row, reason: labels[prediction.cause], confidence: prediction.confidence, action: decision.action, actionText, outcome: decision.outcome, decisionReason: decision.reason, signal: row.kind };
  });
  const totalAtRisk = cases.reduce((sum, item) => sum + item.amount, 0);
  const recovered = cases.filter(item => item.outcome === 'recovered').reduce((sum, item) => sum + item.amount, 0);
  const protectedAmount = cases.filter(item => item.outcome === 'stopped').reduce((sum, item) => sum + item.amount, 0);
  return { cases, evaluation: { trainingRows: training.length, heldOutRows: test.length, diagnosisAccuracy: correct / test.length, meanConfidence: cases.reduce((sum, item) => sum + item.confidence, 0) / cases.length, totalAtRisk, recovered, protectedAmount, reviewCount: cases.filter(item => item.outcome === 'review').length } };
}
const batch = buildBatch();
function json(res, body, code = 200) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }
function serve(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/batch') return json(res, batch);
  if (url.pathname === '/api/evaluation') return json(res, batch.evaluation);
  if (url.pathname === '/api/integrations/razorpay/status') return json(res, { configured: razorpay.config().configured, testMode: razorpay.config().testMode, liveModeBlocked: true });
  if (url.pathname === '/api/integrations/razorpay/payments') return razorpay.fetchRecentPayments(url.searchParams.get('count')).then(body => json(res, body)).catch(error => json(res, { error: error.message }, 400));
  if (url.pathname.startsWith('/api/actions/') && req.method === 'POST') {
    const id = url.pathname.split('/').pop(); const item = batch.cases.find(row => row.id === id);
    if (!item) return json(res, { error: 'Case not found' }, 404);
    if (actionLedger.has(id)) return json(res, { status: 'duplicate_prevented', auditId: actionLedger.get(id) });
    const auditId = `AUD-${Date.now().toString(36).toUpperCase()}`; actionLedger.set(id, auditId);
    return json(res, { status: item.outcome === 'recovered' ? 'executed_in_sandbox' : 'not_executed_by_policy', auditId, action: item.action });
  }
  if (url.pathname.startsWith('/api/integrations/razorpay/recovery-links/') && req.method === 'POST') {
    const id = url.pathname.split('/').pop(); const item = batch.cases.find(row => row.id === id);
    if (!item) return json(res, { error: 'Case not found' }, 404);
    return razorpay.createRecoveryLink(item).then(link => json(res, { status: 'test_link_created', id: link.id, short_url: link.short_url, caseId: id })).catch(error => json(res, { error: error.message }, 400));
  }
  const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.resolve(ROOT, requested);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); return res.end('Not found'); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }); res.end(data); });
}
http.createServer(serve).listen(PORT, '127.0.0.1', () => console.log(`RecoveryOS running at http://127.0.0.1:${PORT}`));
