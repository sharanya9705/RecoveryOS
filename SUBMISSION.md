# RecoveryOS — Buildathon Submission

## Track

**03 — AI Revenue Recovery**

## Project

**RecoveryOS — Close the Revenue Loop, Not the Trust Gap**

## Problem

Merchants lose revenue through failed payments, abandoned checkout, and overdue invoices. The problem is not simply detecting these events. The difficult part is deciding what to do next without repeatedly retrying failed payments, contacting customers without consent, or escalating cases that require human judgment.

RecoveryOS closes this loop by combining AI diagnosis with deterministic recovery policy.

## The Core Idea

> **RecoveryOS is an explainable AI recovery agent that turns payment-loss signals into the next safest revenue action — recovering money only when consent, confidence, and stopping rules allow it.**

Unlike a dashboard that only identifies lost revenue, RecoveryOS diagnoses the likely cause, recommends a bounded intervention, checks whether that intervention is permitted, records the reasoning, and routes uncertain cases to a human.

## What the Prototype Demonstrates

RecoveryOS evaluates a separate **240-case held-out synthetic batch** after training its diagnosis component on **500 synthetic records**.

| Metric | Result |
|---|---:|
| Training records | 500 |
| Held-out cases | 240 |
| At-risk revenue assessed | ₹37,65,527 |
| Eligible automated recovery | ₹6,99,496 |
| Confirmed recovered revenue | **₹6,55,203** |
| Held-out diagnosis accuracy | **95.0%** |
| Macro F1 | **95.8%** |
| Revenue deliberately protected | ₹9,16,964 |
| Cases routed to human review | 83 |
| Cases stopped by policy | 53 |
| Synthetic control recovery | ₹6,24,782 |
| Incremental recovery vs control | **₹30,421 (+4.9%)** |

These are **synthetic prototype results**, not live merchant results. The recovery figure is measured against the eligible recovery cohort rather than treating all at-risk revenue as immediately recoverable.

## Safety and Guardrails

### No consent

When customer contact is not permitted, the system does not initiate an outreach action.

### Retry limit

Cases with two prior recovery attempts are stopped, regardless of model confidence.

The prototype includes a case with **97% diagnosis confidence** that is still blocked because the maximum retry threshold has already been reached.

### Low confidence

Cases below the **75% diagnosis-confidence threshold** are routed to human review rather than automatically acted upon.

### Dispute-sensitive cases

Cases containing dispute signals are protected from automated recovery and routed for human judgment.

### Idempotency

The action layer prevents the same recovery action from being executed repeatedly.

## Architecture

```text
Payment / checkout / invoice events
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
```

The most important architectural boundary is between **AI judgment and recovery actions**:

**The model recommends. The policy engine permits.**

This prevents an AI model from having unbounded authority over recovery actions.

## Why this is meaningfully AI

The diagnosis layer interprets multiple pieces of event context to determine the likely reason for revenue loss and produce a confidence score.

The system distinguishes cases such as:

- bank timeout;
- insufficient funds;
- expired card;
- checkout price comparison;
- cash-flow delay;
- dispute signal;
- unknown intent.

The deterministic policy engine then applies business and safety constraints.

This is deliberately not an LLM wrapper. The AI component has a measurable held-out evaluation, while the policy layer remains deterministic and inspectable.

## Explainability and Auditability

Every recovery decision has an inspectable explanation containing:

- the original loss signal;
- the AI diagnosis;
- confidence;
- policy result;
- selected action;
- final outcome;
- decision history.

The decision audit trail is designed to answer:

> **Why did RecoveryOS act — or why did it refuse to act?**

A high-confidence prediction can still result in a protected outcome when the recovery history violates the retry policy.

## Evaluation Design

The evaluation separates model development from testing:

- **500 synthetic records** are used for training.
- **240 separate synthetic records** form the held-out evaluation batch.
- The evaluation cohort is generated separately from the training cohort.
- Diagnosis accuracy, micro precision/recall/F1 and macro precision/recall/F1 are measured on held-out cases.
- Recovery outcomes distinguish **action eligibility** from **confirmed recovery**; an approved action that does not recover the payment is reported as unrecovered.
- A synthetic no-action counterfactual is used to estimate prototype incremental recovery lift.
- The current control estimate is **₹6,24,782** versus **₹6,55,203** confirmed recovery, an incremental **₹30,421 / 4.9%**. This is not a live merchant experiment.

## What Broke and How It Was Fixed

An early version of the recovery metric counted successful-looking actions as recovered revenue even when policy should have prevented those actions.

The recovery engine was redesigned to separate:

- **action eligibility**
- **recovery outcome**
- **protected revenue**
- **human review**

A second issue occurred in the evaluation-data generator, where an early cohort did not vary correctly and could have produced misleading accuracy. The training and held-out generators were separated, resolving the issue and making the evaluation reproducible.

The resulting system makes its **non-actions visible**, rather than measuring success only by how much money it attempts to recover. It also separates an approved intervention from a confirmed payment recovery, so an unsuccessful retry or link does not get counted as recovered revenue.

## Razorpay Test-Mode Integration

RecoveryOS includes a guarded Razorpay test-mode integration.

The integration supports:

- test-mode configuration verification;
- retrieval of recent test payments;
- policy-gated creation of test Payment Links;
- live-mode credential blocking;
- webhook signature verification at the integration boundary.

The integration is intentionally separated from the diagnosis and policy layers so that AI recommendations cannot directly authorize unrestricted payment actions.

Official references:

- [Razorpay Payment Link API](https://razorpay.com/docs/api/payments/payment-links/create-standard/)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/)

## Product Flow

```text
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
```

The important distinction is that **detection is only the first step**. RecoveryOS creates a closed loop from detection through diagnosis, policy, action, and auditability.

## Production Path

A production implementation would extend the prototype with:

1. Real-time payment, checkout, and invoice event ingestion.
2. A calibrated diagnosis model with precision, recall, and calibration reporting.
3. Incremental recovery-lift measurement against a control cohort.
4. Idempotent payment actions behind a dedicated policy service.
5. Tamper-evident audit storage.
6. Merchant review and approval workflows.
7. Monitoring for complaint rate, false-positive cost, time-to-recovery, and policy-block rate.

## Closing Thesis

RecoveryOS is not built around the assumption that every failed payment should be recovered automatically.

It is built around a stronger principle:

> **A good recovery agent should know both when to act and when not to act.**

Revenue recovery should not mean sending more reminders. It should mean choosing the right intervention for the right case, protecting the customer when the evidence is weak, and knowing when the safest action is to stop.
