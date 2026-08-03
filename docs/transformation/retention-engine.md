# Retention engine

> Sections 33.2 and 33.3. Generated from `facts.json`.

## The scheduler that exists

`src/lib/review.ts` — spaced review built for **judgment**, not flashcards.

| Property | Value |
|---|---|
| Interval ladder (days) | 1, 3, 7, 16, 35, 75, 150 |
| Grades | again, hard, good, easy |
| Ease multiplier | 1.3 … 2.8 |
| Pure module (no `Date`, no randomness) | yes |
| Reviews per daily brief | 3 |

Why a custom ladder rather than SM-2 or FSRS: those are tuned for atomic recall items
reviewed in seconds, where the grade is "did the fact surface". Here a review is a
scenario about a tradeoff, costing one to three minutes, and forgetting is not binary —
the vocabulary stays and the judgment goes. The two mechanics that transfer (expanding
intervals, per-item ease learned from history) are kept; per-second timing and
retrievability curves fitted to millions of cards nobody has are dropped.

The ladder is longer than a flashcard ladder on purpose. Judgment decays slower than
vocabulary, and a senior engineer re-reading the same tradeoff daily is exactly the
monotony that kills the habit.

Purity matters for a reason specific to this repo: `Date.now()` and `Math.random()`
are forbidden at runtime, because the app is a static export and a non-deterministic
render breaks hydration parity.

## The queue: 1 of 8 sources

Section 33.2 names eight signals an adaptive queue should combine.

| Source | Implemented |
|---|---|
| concepts near forgetting | yes |
| recent mistakes | **no** |
| correct but low confidence | **no** |
| wrong but high confidence | **no** |
| saved concepts | **no** |
| weak prerequisites | **no** |
| knowledge the active module needs | **no** |
| unreviewed for too long | **no** |

**This table read 3 of 8 before the detectors were corrected**, and both errors
flattered the implementation:

- "weak prerequisites" matched `/prerequisite/` in `daily.ts`. That code refuses to serve a concept whose prerequisites are unread — it gates what comes next, and does not surface a shaky prerequisite for review. Different mechanism, opposite direction.
- "unreviewed for too long" reused the same `dueConcepts` probe as "concepts near forgetting", so one implemented feature was counted as two.

A capability matrix is only as honest as its weakest predicate, which is why each one
now names the symbol it would need to find.

## What to build next, in order

1. **Wrong-with-high-confidence into the queue.** The data already exists in `responseLog`; it is the highest-value signal in section 33.2 and the cheapest to wire, because nothing new has to be collected.
2. **Confidence on checks.** 380 checks currently produce none, so 67% of the item pool cannot contribute calibration data.
3. **Recent mistakes.** Straightforward from `responseLog`; today's brief ignores it.
4. **Last-seen age**, independent of the ladder — a concept can be "not due" and still cold.

Saved concepts and active-module knowledge both depend on features that do not exist
yet (`saved-content-model.md`, and a notion of an active module).

## Interference with the daily brief

The brief serves 3 reviews plus one fresh concept, and refuses
the fresh concept until its within-domain prerequisites are read. The 37
cross-route `leansOn` edges are deliberately **not** gates: making them gates would
force every AI learner through the systems domain, which is the coupling the route split
exists to remove.
