# Analytics plan

> Section 21. Generated from `facts.json`.

## Current state: nothing is instrumented

**0 tracking calls.** No gtag, no PostHog, no Plausible, no Mixpanel,
no Amplitude. 0 fetches to an API route, because there are none.

This is a deliberate consequence of the deployment model, not an oversight:
`output: "export"` with
`localStorage`-only persistence and no auth. There is no server to receive an event.

So this document plans instrumentation; it does not report on any.

## What the platform already knows locally

`Progress` has 20 fields in a single `localStorage` key
(`levelup.v1`; the other key, `levelup.theme`, holds the theme only). Every
question below is answerable from data already on the learner's device:

| Question | Field it comes from |
|---|---|
| Which concepts were read but never checked? | `conceptsRead` minus `responseLog` |
| Where does a checkpoint get failed twice and abandoned? | `checkpointAttempts` at the cap with no clear |
| Which checks are answered wrong most? | `responseLog` |
| Is the streak real or a single long session? | `streak.days`, `dailyLog` |
| Which concepts get skipped? | `skipped` |
| Is confidence calibrated? | `responseLog` confidence vs correctness |

## The plan

**Phase 1 — local-only, no network.** Derive the above on-device and show it to the
learner on `/me`. No consent needed, nothing leaves the browser, and it answers the
questions that change the content. This is the phase worth doing, and it needs no
backend.

**Phase 2 — aggregate, opt-in.** If cohort data is ever needed, a single endpoint
receiving a coarse daily rollup — concepts completed, checkpoints attempted, no item
ids, no free text. Opt-in, off by default, and it breaks the static-export model, which
is the cost to weigh.

## Events, if phase 2 happens

| Event | Properties | Question it answers |
|---|---|---|
| `concept_opened` | route, stage, concept | Which stages are entered and abandoned |
| `predict_committed` | concept, correct | Does committing first change downstream accuracy |
| `check_answered` | mechanic, correct, attempt | Which of the 4 mechanics teaches best |
| `checkpoint_attempted` | id, score, attempt | Where the 35 gates are too hard |
| `route_chosen` | ai-architect, staff-engineer, shared-foundations | Whether the split matches demand |
| `session_ended` | duration, stages completed | Whether a session contains a decision |

## Rules

- **No PII, ever.** No email, no name, no free text. The platform has no accounts, so there is nothing to leak.
- **A metric that cannot change a decision is not collected.** Page views on `/method` change nothing.
- **Local first.** If a question is answerable on-device, it is not sent.
- **The learner can see and delete everything.** `BackupPanel` already exports and clears the full `Progress` object.
