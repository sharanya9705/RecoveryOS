RecoveryOS — Buildathon Submission

Track

03 — AI Revenue Recovery

Project

RecoveryOS — Close the Revenue Loop, Not the Trust Gap

Problem

Merchants lose revenue through failed payments, abandoned checkout, and overdue invoices. The problem is not simply detecting these events. The difficult part is deciding what to do next without repeatedly retrying failed payments, contacting customers without consent, or escalating cases that require human judgment.

<<<<<<< HEAD
Unlike a dashboard that only identifies loss, RecoveryOS closes the loop: it diagnoses the reason, chooses a bounded action, records why, and routes uncertain or unsafe cases to a human. The core principle is simple: **AI proposes; policy permits.**

## Why this can win

RecoveryOS is deliberately built around the track’s full bar, not just a classifier or dashboard:

| Buildathon requirement | RecoveryOS evidence |
| --- | --- |
| Detect revenue at risk | Failed-payment, abandoned-checkout, and overdue-invoice cases. |
| Determine an intervention | Diagnosis model produces a cause and confidence score. |
| Execute a bounded workflow | One retry, one secure link, human handoff, or a hard stop. |
| Measure recovered money | Deterministic held-out batch metrics. |
| Compliant escalation and stopping rules | Consent, dispute, confidence, and retry-limit policy gates. |
| Audit trail | Per-case explanation and event ledger. |
=======
RecoveryOS closes this loop by combining AI diagnosis with deterministic recovery policy.
>>>>>>> e83c67fbd20c42bf2e4c7243d8eaa4fa80e01d57

The Core Idea

RecoveryOS is an explainable AI recovery agent that turns payment-loss signals into the next safest revenue action — recovering money only when consent, confidence, and stopping rules allow it.

Unlike a dashboard that only identifies lost revenue, RecoveryOS diagnoses the likely cause, recommends a bounded intervention, checks whether that intervention is permitted, records the reasoning, and routes uncertain cases to a human.

What the Prototype Demonstrates

RecoveryOS evaluates a separate 240-case held-out synthetic batch after training its diagnosis component on 500 synthetic records.

Metric

Result

Training records

500

Held-out cases

240

At-risk revenue assessed

₹34,45,625

Recovery reported in eligible-action cohort

₹14,92,599

Held-out diagnosis accuracy

95.4%

Revenue deliberately protected

₹10,19,159

Cases routed to human review

52

These are synthetic prototype results, not live merchant results. The recovery figure is measured against the eligible recovery cohort rather than treating all at-risk revenue as immediately recoverable.

Safety and Guardrails

No consent

When customer contact is not permitted, the system does not initiate an outreach action.

Retry limit

Cases with two prior recovery attempts are stopped, regardless of model confidence.

The prototype includes a case with 97% diagnosis confidence that is still blocked because the maximum retry threshold has already been reached.

Low confidence

Cases below the 75% diagnosis-confidence threshold are routed to human review rather than automatically acted upon.

Dispute-sensitive cases

Cases containing dispute signals are protected from automated recovery and routed for human judgment.

Idempotency

The action layer prevents the same recovery action from being executed repeatedly.

Architecture

Payment / checkout / invoice events
<<<<<<< HEAD
             ↓
      Case normalizer
             ↓
  Local diagnosis model + confidence score
             ↓
 Policy engine (consent, dispute, max attempts, confidence threshold)
             ↓
Bounded action: retry once | secure link once | human queue | stop
             ↓
   Audit ledger + batch recovery metrics
```

The optional Razorpay integration is test-mode-only. It fetches test payments and creates a Payment Link only for policy-approved cases; live-mode credentials are blocked in code. For production, replace the demo fixture with validated event/webhook ingestion, use a calibrated classifier measured on held-out data, call idempotent payment actions through a policy service, and persist the ledger in a tamper-evident store.
=======
              ↓
       Case normalizer
              ↓
 Diagnosis model + confidence
              ↓
 Policy engine
 consent / confidence /
 attempts / dispute checks
              ↓
 Bounded recovery action
 retry | secure link | human | stop
              ↓
      Audit decision ledger
              ↓
       Batch-level metrics

The most important architectural boundary is between AI judgment and recovery actions:
>>>>>>> e83c67fbd20c42bf2e4c7243d8eaa4fa80e01d57

The model recommends. The policy engine permits.

<<<<<<< HEAD
**0:00–0:35 — Hook**  
“A failed payment is not a reminder problem. It is a judgment problem: retry too soon and you annoy a customer; never retry and you lose recoverable revenue. RecoveryOS decides the next *safe* action for each lost payment — and can prove why it acted or stopped.”

**0:35–1:15 — Problem and stakes**  
Show that revenue loss has different causes: bank timeout, insufficient funds, checkout friction, cash-flow delay, and disputes. Emphasize that a generic recovery workflow treats these radically different situations the same way.

**1:15–2:30 — Live product walkthrough**  
Run the 240-case held-out batch. Call out the diagnosis accuracy, recovered amount, and protected amount. Filter to Protected and open a case with two prior attempts. Then open a low-confidence or dispute case and show the human-review path.

**2:30–3:30 — Why this is AI**  
The local model interprets multi-event context and returns a cause plus confidence, rather than following a single fixed rule. Deterministic policy then protects the customer. Say the line: “AI proposes; policy permits.” The agent cannot take an unbounded money action.

**3:30–4:20 — Measured result**  
State the exact held-out synthetic-batch result and label it as synthetic prototype data: ₹34,45,625 assessed; ₹14,92,599 sandbox-recovered; ₹10,19,159 protected; 95.4% held-out diagnosis accuracy. Explain that production evaluation adds action-level incremental recovery lift, complaint rate, false-positive cost, and time-to-recovery.
=======
This prevents an AI model from having unbounded authority over recovery actions.

Why this is meaningfully AI

The diagnosis layer interprets multiple pieces of event context to determine the likely reason for revenue loss and produce a confidence score.

The system distinguishes cases such as:

bank timeout;
>>>>>>> e83c67fbd20c42bf2e4c7243d8eaa4fa80e01d57

insufficient funds;

expired card;

checkout price comparison;

<<<<<<< HEAD
**What it solves:** RecoveryOS detects payment revenue at risk, diagnoses the likely reason, and executes only a consent-aware, bounded recovery workflow. It handles failed payments, abandoned checkout, and overdue invoices. Its policy engine blocks unsafe outreach, stops after two attempts, routes disputes and ambiguous cases to a human, and leaves an auditable explanation for every decision. The prototype includes a guarded Razorpay test-mode adapter for retrieving test payments and creating policy-approved one-time Payment Links.

**What broke, and how you got out:** My first batch generator had a deterministic-seeding error: it created a non-varying cohort, so the apparent evaluation quality was not trustworthy. I fixed it by using separate sequential seeded generators for the training and held-out sets, then verified the API response directly. I also separated action eligibility from outcome, added protected and review states, and stopped counting blocked cases as successful-looking recovery. The result is more honest: the prototype now shows what it deliberately does *not* chase, reports reproducible held-out accuracy, and exposes the exact guardrail behind every stop.

## Likely judge questions

**“Why not use a rules engine?”**
Rules keep money movement and outreach safe, but they cannot reliably infer the cause of a loss from mixed payment context. RecoveryOS uses the model for diagnosis and the policy layer for control.

**“What happens when the model is uncertain?”**
Anything below 75% confidence routes to human review. The agent does not force a recovery action.

**“Are these live business results?”**
No. They are deterministic synthetic held-out evaluation results and are labelled as such. The test-mode adapter is the bridge to real integration validation.

**“How do you prevent duplicate recovery?”**
Every action is idempotent by case ID, while policy limits outreach and prevents actions after consent withdrawal, a dispute signal, or two existing attempts.
=======
cash-flow delay;

dispute signal;
>>>>>>> e83c67fbd20c42bf2e4c7243d8eaa4fa80e01d57

unknown intent.

<<<<<<< HEAD
- Public GitHub repository with the README, `SUBMISSION.md`, and no secrets.
- Deploy the Node prototype (Render / Railway / Vercel serverless adaptation) or record the localhost demo.
- Record the five-minute video using the pitch structure above.
- Complete the eligibility fields: personal email, name, college, graduation year, September in-person availability, preferred six or twelve month internship, and resume.
- Submit before the 5 September deadline stated on the Buildathon page.
=======
The deterministic policy engine then applies business and safety constraints.

This is deliberately not an LLM wrapper. The AI component has a measurable held-out evaluation, while the policy layer remains deterministic and inspectable.

Explainability and Auditability

Every recovery decision has an inspectable explanation containing:

the original loss signal;

the AI diagnosis;

confidence;

policy result;

selected action;

final outcome;

decision history.

The audit trail is designed to answer:

Why did RecoveryOS act — or why did it refuse to act?

A high-confidence prediction can still result in a protected outcome when the recovery history violates the retry policy.

Evaluation Design

The evaluation separates model development from testing:

500 synthetic records are used for training.

240 separate synthetic records form the held-out evaluation batch.

The evaluation cohort is generated separately from the training cohort.

Diagnosis accuracy is measured on held-out cases.

Recovery outcomes are evaluated through the policy and action layers rather than treating every prediction as a successful recovery.

What Broke and How It Was Fixed

An early version of the recovery metric counted successful-looking actions as recovered revenue even when policy should have prevented those actions.

The recovery engine was redesigned to separate:

action eligibility

recovery outcome

protected revenue

human review

A second issue occurred in the evaluation-data generator, where an early cohort did not vary correctly and could have produced misleading accuracy. The training and held-out generators were separated, resolving the issue and making the evaluation reproducible.

The resulting system makes its non-actions visible, rather than measuring success only by how much money it attempts to recover.

Razorpay Test-Mode Integration

RecoveryOS includes a guarded Razorpay test-mode integration.

The integration supports:

test-mode configuration verification;

retrieval of recent test payments;

policy-gated creation of test Payment Links;

live-mode credential blocking;

webhook signature verification at the integration boundary.

The integration is intentionally separated from the diagnosis and policy layers so that AI recommendations cannot directly authorize unrestricted payment actions.

Official references:

Razorpay Payment Link API

Razorpay Webhooks

Product Flow

Detect
  ↓
Identify revenue at risk
  ↓
Diagnose
  ↓
Understand why the loss occurred
  ↓
Decide
  ↓
Apply consent, confidence, retry and dispute policies
  ↓
Recover
  ↓
Retry, send a secure link, escalate, or stop
  ↓
Explain
  ↓
Record the decision and outcome

The important distinction is that detection is only the first step. RecoveryOS creates a closed loop from detection through diagnosis, policy, action, and auditability.

Production Path

A production implementation would extend the prototype with:

Real-time payment, checkout, and invoice event ingestion.

A calibrated diagnosis model with precision, recall, and calibration reporting.

Incremental recovery-lift measurement against a control cohort.

Idempotent payment actions behind a dedicated policy service.

Tamper-evident audit storage.

Merchant review and approval workflows.

Monitoring for complaint rate, false-positive cost, time-to-recovery, and policy-block rate.

Closing Thesis

RecoveryOS is not built around the assumption that every failed payment should be recovered automatically.

It is built around a stronger principle:

A good recovery agent should know both when to act and when not to act.

Revenue recovery should not mean sending more reminders. It should mean choosing the right intervention for the right case, protecting the customer when the evidence is weak, and knowing when the safest action is to stop.
>>>>>>> e83c67fbd20c42bf2e4c7243d8eaa4fa80e01d57
