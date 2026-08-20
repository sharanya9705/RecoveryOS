# RecoveryOS — submission kit

## The choice

**Track:** 03 — AI Revenue Recovery  
**Project:** RecoveryOS — close the revenue loop, not the trust gap

## Problem statement

For merchants, lost revenue is not one problem: a payment can fail because a bank times out, a checkout can be abandoned, or an invoice can become overdue. Existing recovery tools either only surface the problem or apply blunt outreach. That leaves money unrecovered and risks irritating customers, violating consent preferences, or retrying a payment when it cannot succeed.

## The winning statement

**RecoveryOS is an explainable AI recovery agent that turns payment-loss signals into the next safest revenue action — recovering money only when consent, confidence, and stopping rules allow it.**

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

## What the prototype proves

On a deterministic **240-case held-out synthetic batch**, RecoveryOS assessed **₹34,45,625** of at-risk revenue and recovered **₹14,92,599**. It deliberately protected **₹10,19,159** by refusing unsafe actions and routing **52** ambiguous or dispute-sensitive cases to review. The diagnosis model achieved **95.4% held-out accuracy** after training on a separate 500-record synthetic training set.

The demo includes three failure-safe paths judges can inspect:

1. No consent → no contact.
2. Two prior attempts → hard stop, even with a high-confidence diagnosis.
3. Diagnosis below 75% confidence or dispute signal → human review, no auto-action.

## Architecture

```text
Payment / checkout / invoice events
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

## Five-minute pitch structure

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

**4:20–5:00 — Close**  
“Revenue recovery is not about sending more reminders. It is about having judgment at the moment a merchant is about to lose money. RecoveryOS recovers the right rupee, in the right way, and knows when to stop.”

## Form answers: build fields

**Project name:** RecoveryOS — Close the Revenue Loop, Not the Trust Gap

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

## Submission checklist

- Public GitHub repository with the README, `SUBMISSION.md`, and no secrets.
- Deploy the Node prototype (Render / Railway / Vercel serverless adaptation) or record the localhost demo.
- Record the five-minute video using the pitch structure above.
- Complete the eligibility fields: personal email, name, college, graduation year, September in-person availability, preferred six or twelve month internship, and resume.
- Submit before the 5 September deadline stated on the Buildathon page.
