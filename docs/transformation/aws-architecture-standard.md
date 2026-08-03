# AWS architecture learning standard

> Section 38. Generated from `aws-architecture-inventory.json`.

## Position

AWS is a concrete implementation of a principle, never a service catalogue. A learner who
can name Aurora but cannot say what a partition costs them has learned nothing
transferable.

## Teaching order

Section 38.1, in order: problem and constraints → conceptual architecture → AWS mapping →
alternatives → security → reliability → observability → cost → deployment → failure
exercise.

The rule that matters is the first step. Starting at "pick a service" is the failure mode,
and it is what most vendor material does.

## Inventory

20 AWS claims across the content, and
**every one points at the pinned-facts file**
(`research/2026-07-25-aws-verified-facts.md`).

2 named services are **not** pinned in that file:
`Config`, `CloudWatch`. Reporting zero here would have been the
suspicious answer — the corpus names more services than the facts file covers, and saying
so is the useful part. Anything the file marks UNVERIFIED is described as a mechanism
rather than asserted as a number.

## Rules

- **A figure or a limit traces to a fetched document.** `check-trace.cjs` enforces it with a ratchet baseline.
- **An unverified vendor claim is described, not quantified.** "Provisioned concurrency removes the cold start from the request path" is a mechanism; a specific millisecond figure would need a source.
- **101 of 401 content units are classed `fast-changing`** in `content-review-schedule.json`, because vendor claims rot. Full distribution: 101 fast-changing, 208 stable, 50 research-frontier, 42 slowly-changing.
- **`lastReviewed` is `null` for every unit**, because the content model has no such field. Emitting a plausible timestamp would make the whole schedule untrustworthy, so the gap is the output.

## Gaps against section 38.2

The spec's `aws_architecture` schema asks for `business_problem`, `users`,
`functional_requirements`, `non_functional_requirements`, `assumptions`, `scale`,
`account_boundaries`, `network_boundaries`, `identity_model` and
`data_classification`.

`CodexArchitecture` has `problem`, `whenThisShape`, `components`, `flow`,
`tradeoffs`, `failureModes`, `source`, `vendor` and `diagram` — 14
architectures on that shape. It covers the problem, the shape and the failure modes; it
does **not** carry scale, account or network boundaries, an identity model, or data
classification.

So the 14 architectures teach the shape and its tradeoffs, and stop
short of the security and multi-account depth section 38 asks for. That is a content
gap with a schema change behind it, not an authoring oversight.
