# RecoveryOS — submission kit

## The choice

**Track:** 03 — AI Revenue Recovery  
**Project:** RecoveryOS — close the revenue loop, not the trust gap

## Problem statement

For merchants, lost revenue is not one problem: a payment can fail because a bank times out, a checkout can be abandoned, or an invoice can become overdue. Existing recovery tools either only surface the problem or apply blunt outreach. That leaves money unrecovered and risks irritating customers, violating consent preferences, or retrying a payment when it cannot succeed.

## The winning statement

**RecoveryOS is an explainable AI recovery agent that turns payment-loss signals into the next safest revenue action — recovering money only when consent, confidence, and stopping rules allow it.**

Unlike a dashboard that only identifies loss, RecoveryOS closes the loop: it diagnoses the reason, chooses a bounded action, records why, and routes uncertain or unsafe cases to a human.

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
  Diagnosis model + confidence score
             ↓
 Policy engine (consent, max attempts, confidence threshold)
             ↓
Bounded action: retry | secure link | human queue | stop
             ↓
   Audit ledger + batch recovery metrics
```

For production, replace the demo fixture with event/webhook ingestion, use a calibrated classifier measured on held-out data, call idempotent payment actions through a policy service, and persist the ledger in a tamper-evident store.

## Five-minute pitch structure

**0:00–0:35 — Hook**  
“When a payment fails, most merchants get a red dashboard number. Then a customer gets a generic reminder — or nothing. Both outcomes lose money. RecoveryOS asks a better question: what is the next *safe* action for this specific lost payment?”

**0:35–1:15 — Problem and stakes**  
Describe failure types: bank timeout, insufficient funds, checkout friction, cash-flow delay. Emphasize that blind retry and indiscriminate chasing damage trust.

**1:15–2:30 — Live product walkthrough**  
Run the batch. Call out the held-out accuracy and recovered amount, then filter to Protected. Open a case with two prior attempts and show the hard stop. Open a low-confidence or dispute case and show human review.

**2:30–3:30 — Why this is AI**  
The model interprets payment context and produces a reason plus confidence; deterministic policy protects the customer. AI proposes, policy permits. The agent does not take an unbounded money action.

**3:30–4:20 — Measured result**  
State the exact held-out synthetic-batch result and clearly label it as synthetic prototype data. Explain that production evaluation is action-level incremental recovery lift, complaint rate, false-positive cost, and time-to-recovery.

**4:20–5:00 — Close**  
“Revenue recovery is not about sending more reminders. It is about having judgment at the moment a merchant is about to lose money. RecoveryOS recovers the right rupee, in the right way, and knows when to stop.”

## Form answers: build fields

**Project name:** RecoveryOS — Close the Revenue Loop, Not the Trust Gap

**What it solves:** RecoveryOS detects payment revenue at risk, diagnoses the likely reason, and executes only a consent-aware, bounded recovery workflow. It handles failed payments, abandoned checkout, and overdue invoices. Its policy engine prevents unsafe outreach, stops after two attempts, sends ambiguous cases to a human, and leaves an auditable explanation for each decision.

**What broke, and how you got out:** During early batch design, the recovery metric accidentally counted every successful-looking action as recovered, even actions that policy should have blocked. I separated action eligibility from outcome, then added explicit protected and review states. I also found an evaluation-data generation bug that produced a non-varying cohort and invalid accuracy. I fixed it by separating sequential seeded training and held-out generators, then verified the API output. This made the result more honest: the system now shows revenue it intentionally did *not* chase, exposes reproducible held-out accuracy, and lets the reviewer inspect the exact guardrail that stopped it.

## Submission checklist

- Public GitHub repository with this README and no secrets.
- Deploy the static prototype (GitHub Pages / Vercel / Netlify).
- Record the five-minute video using the pitch structure above.
- Complete the eligibility fields: personal email, name, college, graduation year, September in-person availability, preferred six or twelve month internship, and resume.
- Submit before the 5 September deadline stated on the Buildathon page.
