# RecoveryOS

> Close the revenue loop — not the trust gap.

**RecoveryOS** is an explainable AI revenue-recovery agent built for the **Razorpay AI Buildathon · Track 03: AI Revenue Recovery**. It detects payment revenue at risk, diagnoses the likely cause, chooses the least intrusive policy-approved action, and records an audit trail for every decision.

## Why this matters

Merchants lose revenue through failed payments, abandoned checkouts, and overdue invoices. Most recovery systems either stop at detection or chase every customer with the same generic reminder. That loses recoverable revenue and creates complaint, consent, and trust risk.

RecoveryOS closes the loop safely:

```text
Loss event → diagnosis + confidence → policy gate → bounded action → auditable outcome
```

## What it demonstrates

- A locally trained, explainable Naive Bayes diagnosis model.
- A separate **500-record synthetic training set** and **240-case held-out evaluation batch**.
- Multi-channel loss handling: failed payments, abandoned checkout, and overdue invoices.
- A minimum-intrusion action policy: one idempotent retry, one secure Payment Link, or human handoff.
- Hard guardrails: explicit contact consent, 75% automation confidence, dispute routing, and a two-attempt recovery limit.
- An inspectable decision ledger, including cases RecoveryOS deliberately refuses to chase.
- Optional Razorpay **test-mode-only** integration for payment retrieval and approved Payment Link creation.

## Reproducible prototype results

The demo is deterministic. On the included 240-case held-out **synthetic** evaluation batch, it reports:

| Metric | Result |
| --- | ---: |
| At-risk revenue assessed | ₹34,45,625 |
| Sandbox-recovered revenue | ₹14,92,599 |
| Revenue protected by stopping rules | ₹10,19,159 |
| Human-review cases | 52 |
| Held-out diagnosis accuracy | 95.4% |

These are synthetic prototype results, not live merchant results. Production evaluation must measure action-level incremental recovery lift, false-positive cost, complaint rate, and time-to-recovery.

## Architecture

```text
Payment / checkout / invoice events
              ↓
   Contextual diagnosis model
              ↓
Policy engine: consent · confidence · dispute · retry limit
              ↓
Retry once | secure link once | human review | stop
              ↓
      Idempotent action ledger
```

**AI proposes; policy permits.** Low-confidence, disputed, non-consented, or over-contacted cases never auto-act.

## Run locally

### Requirements

- Node.js 18+ (no external packages needed)

### Start

```powershell
node server.js
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173), then select **Run recovery batch**.

If port 4173 is already in use:

```powershell
$env:PORT=4174
node server.js
```

Open [http://127.0.0.1:4174](http://127.0.0.1:4174).

## Razorpay test-mode integration

The integration is intentionally guarded: it accepts **only** `rzp_test_...` credentials and blocks live-mode keys.

1. Copy `.env.example` to `.env`.
2. Add your own Razorpay Test Key ID and Test Key Secret. Never commit or share `.env`.
3. Restart the server.
4. Check configuration at `GET /api/integrations/razorpay/status`.

Available endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/integrations/razorpay/status` | Confirm configuration without exposing credentials. |
| `GET /api/integrations/razorpay/payments?count=10` | Fetch recent test payments. |
| `POST /api/integrations/razorpay/recovery-links/:caseId` | Create a one-time test Payment Link only when policy permits it. |

Use only a few links in the demo. Razorpay documents a 30 Payment Links test-mode limit per business. Follow the official [Payment Link API](https://razorpay.com/docs/api/payments/payment-links/create-standard/) and [webhook security guidance](https://razorpay.com/docs/webhooks/) before connecting real events.

## Demo script

1. Run the batch and point to the held-out accuracy, recovered revenue, and protected revenue.
2. Filter to **Protected** and open a case that has already exhausted its two recovery attempts.
3. Open a human-review case to show that a dispute or low confidence prevents automation.
4. Explain the central design choice: the model can recommend an action, but it cannot override consent or policy.
5. Create one approved **test-mode** Payment Link and show the case ID in the response.

## Repository layout

```text
server.js       Local server, evaluation engine, policy API
razorpay.js     Guarded Razorpay test-mode adapter
app.js          Interactive demo UI
index.html      Interface structure
styles.css      Interface styling
.env.example    Safe credential template
SUBMISSION.md   Buildathon application and pitch kit
```

## Production path

1. Ingest validated Razorpay webhooks and normalise events into a durable event store.
2. Train and calibrate on consented historical data; measure precision, recall, and intervention lift on holdout cohorts.
3. Keep actions idempotent, version every policy, and enforce approvals for high-risk actions.
4. Verify webhook signatures on the raw request body and persist the audit trail to a tamper-evident store.
5. Give merchants a review queue, feedback controls, and an easy opt-out path.

---

Built for the Razorpay AI Buildathon. The strongest recovery system is one that knows exactly when **not** to act.
