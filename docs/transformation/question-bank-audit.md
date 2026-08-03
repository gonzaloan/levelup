# Question bank audit

> Section 42. Generated from `question-bank.json`.

## Scope

678 items: every scored thing the platform can serve —
183 checkpoint MCQs, 105 mid-lesson items, 380
mechanic checks, 10 build challenges.

## Findings

**Every MCQ has exactly one correct option.** Asserted, not assumed; a zero-or-many key
is the defect that makes a score meaningless.

**The corpus is situated, not definitional.** Fewer than 10% of checkpoint MCQs classify
as definition questions; the pedagogy audit measured 180 of 183 as judgment items with a
stricter classifier. This is the corpus's real strength and the thing a regression would
erode first.

**No mid-lesson item is scored.** 105 formative items, by design — a
learner who has seen the answer has not been assessed.

**Every item's route agrees with the route model.** Checked against `routeOfDomain()`,
which throws on an unmapped domain rather than defaulting. A silent fallback is what made
every Cloud lesson render as "Technical Depth" when the seventh domain was added.

## The category error this audit exists for

The first run of the generator reported **290 "definition" items**. 273 of them were
check *prompts* — and a check prompt is an imperative ("Sort each failure by who acts on
it", "Order the steps"). Running a definition-versus-judgment heuristic over an
instruction measures the grammar of the imperative and nothing about the item.

A check is now classified by its **mechanic**, and `stemKind` returns
`"n/a-instruction"` for anything that is not an MCQ. `tests/inventories.test.ts`
asserts this directly, because the wrong number was plausible enough to publish.

## Coverage

`check-coverage.cjs` derives a domain × mechanic matrix from the spine and fails on an
unbaselined gap. The defect it was built for: `cloud-platform` had **0 of 290** checks
reaching it despite 78 being authored, because the pool filter never matched its domain.
Now 26 of 26.

## Open

- **10 build challenges** is too few for the graded/practice split to be disjoint the way `poolFor()` splits the 380 checks.
- **60 of 101 categorize keys are even sweeps in authored order.** Recorded as content defects in ADR-011, because widening the display guard would forbid the entire permutation space at three pairs.
- **No IRT calibration.** Difficulty is author-assigned and provisional; `responseLog` is collected for the future.
