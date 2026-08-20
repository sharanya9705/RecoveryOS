# RecoveryOS

An explainable, bounded recovery agent for the Razorpay AI Buildathon — **Track 03: AI Revenue Recovery**.

## Problem

Merchants lose revenue when payments fail, checkouts are abandoned, subscriptions lapse, or invoices go overdue. Recovery workflows are usually fragmented, indiscriminate, and hard to audit. Aggressive automation also creates customer-trust and compliance risk.

## What this prototype demonstrates

- Ingests a batch of 12 synthetic revenue-loss cases across failed payments, abandoned checkout and invoices.
- Diagnoses a likely cause from payment context and supplies a confidence score.
- Selects a minimum-intrusion intervention: bounded retry, one secure link, or human handoff.
- Enforces guardrails: contact consent, 75% automation confidence, and a maximum of two prior recovery attempts.
- Reports batch recovery performance and protects unsafe cases rather than acting on them.
- Records a per-case explainable decision and immutable-style audit trail.

## Run locally

No packages or secrets are required. From this directory, run:

```powershell
node server.js
```

Open `http://127.0.0.1:4173`, then select **Run recovery batch**. The server trains an explainable local diagnosis model on 500 synthetic training records and evaluates it over a separate 240-case held-out batch. The API also exposes action execution semantics with idempotency protection for the demo sandbox.

## Razorpay test-mode integration

RecoveryOS includes an optional, deliberately test-mode-only integration. Copy `.env.example` to `.env` and enter your own Razorpay **test** key ID, test key secret, and webhook secret locally. Never share the secret in chat or commit `.env`.

- `GET /api/integrations/razorpay/status` confirms configuration without revealing credentials.
- `GET /api/integrations/razorpay/payments?count=10` fetches recent test payments.
- `POST /api/integrations/razorpay/recovery-links/:caseId` creates a one-time test Payment Link only when the policy permits the action. Live-mode keys are blocked in code.

For the demo, create no more than a few links: Razorpay documents a 30 Payment Links limit per business in test mode. Configure test webhook delivery separately, and verify the `X-Razorpay-Signature` on the raw request body before recording an event. [Razorpay’s Payment Link API](https://razorpay.com/docs/api/payments/payment-links/create-standard/) and [webhook guidance](https://razorpay.com/docs/webhooks/) cover those behaviours.

## Submission framing

**Project:** RecoveryOS — Close the Revenue Loop, Not the Trust Gap

**Track:** AI Revenue Recovery

**Measured batch result:** generated deterministically from a 240-case synthetic held-out evaluation batch. All results are prototype data and must be labelled as synthetic in the pitch. Never claim live merchant recovery until it has been run against an approved test-mode integration.

## Production path

1. Stream payment and checkout webhooks into an event store.
2. Use a calibrated classifier with offline precision/recall and action-level lift evaluation.
3. Execute only Razorpay-supported, idempotent payment actions through a policy service.
4. Persist the audit trail to a tamper-evident store and give merchants a review queue.
