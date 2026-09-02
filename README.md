# RecoveryOS

**Explainable AI revenue recovery for Razorpay AI Buildathon — Track 03.**

RecoveryOS closes the loop from a payment-loss signal to the next safest revenue action. A local Naive Bayes diagnosis model recommends the likely cause and confidence; a deterministic policy engine decides whether recovery is allowed.

> **The model recommends. The policy permits.**

**DEPLOYMENT - https://recoveryos-jnng.onrender.com/**

## Judge quick start

No npm install is required.

```bash
node server.js
```

Open `http://127.0.0.1:4173`.

1. Click **Run recovery batch**.
2. Review the batch-level recovery and model metrics.
3. Filter **Protected** to see policy stops.
4. Open **PAY-1063 → Why?** to see the 97% confidence case that is still stopped after two previous attempts.
5. Open an **Unrecovered** case to see the difference between an approved action and a confirmed recovery.
6. If Razorpay test credentials are configured, use the integration endpoints to retrieve test payments or create a policy-gated test Payment Link.

## What is evaluated

- 500 synthetic training records
- 240 separately generated held-out cases
- diagnosis accuracy, precision, recall and F1
- revenue at risk and confirmed recovery
- protected revenue and human-review routing
- a synthetic no-action counterfactual for prototype recovery-lift measurement
- action eligibility vs confirmed outcome
- duplicate-action prevention and audit metadata

## Safety boundary

AI never directly authorizes a payment action. Policy checks consent, retry count, dispute signals and diagnosis confidence before an action can proceed. Live Razorpay credentials are blocked in the integration.

## Prototype evaluation caveat

The treatment/control comparison is a **synthetic counterfactual**, not a live merchant experiment. It exists to demonstrate that the evaluation pipeline can distinguish recovered revenue from naturally recovered revenue. Production lift should be measured with randomized or carefully matched merchant cohorts.

See [`SUBMISSION.md`](./SUBMISSION.md) for the full buildathon submission.
