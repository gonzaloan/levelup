# Evaluation system

> Section 34. Generated from `facts.json` and `question-bank.json`.

## The pool

662 scored items across four surfaces.

| Surface | Count | Scored | Reveals detail |
|---|---:|---|---|
| Checkpoint MCQ | 183 | yes | total only |
| Mid-lesson quiz | 105 | **no** — formative by design | yes |
| Mechanic checks | 368 | when graded | practice only |
| Build challenges | 6 | yes | practice only |

Mechanics: 80 cloze, 101 categorize, 94 order, 93 match.

## What makes a score mean something

Four defects had to be fixed before any of these numbers could be trusted, and each was
found by attacking the surface rather than reading it:

1. **Three of four mechanics were passable positionally.** `checkDisplay.ts` now re-keys the display permutation until an exploit predicate fails, and each mechanic must defeat its whole blind FAMILY — rotations, reflections, alternations, not just the identity. 0 of 368 are now positionally passable across attempts 0-3.
2. **Graded and practice pools overlapped 94.3%.** `poolFor()` splits by authored index parity, so they are disjoint. Reachable checks went from 20% to 57%.
3. **A failed attempt revealed the key, and the retry replayed the identical order** — a Mastermind oracle: frozen order plus per-element feedback lets a solver eliminate consistently. The attempt number is now folded into the shuffle key and persisted in `Progress`.
4. **`/build` printed the answer key** for every graded challenge, because `revealSpec` defaulted to the formative behaviour.

`showDetail` centralises the rule: a graded surface reveals no per-element marking, no
partial score, and no explanation.

## Attempt cap and threshold

Two attempts per checkpoint, threshold `max(0.85, (n-1)/n)`, both persisted. The cap
was React state, so a page reload reset it — within six reloads 28 of 35 checkpoints
cleared above 5% and five above 95%. `recordCheckpoint` now refuses to score past the
cap rather than clamping after the fact.

## Zero-knowledge clear probability

Computed with Poisson-binomial distributions rather than assumed, because "shuffled so
it is fine" is not a measurement. The threshold formula is what keeps a short checkpoint
honest: at n=4 items, `(n-1)/n` = 0.75 loses to the 0.85 floor, so three of four is
not a clear.

## Known limits

- **6 Build challenges** across 178 concepts, so constructive assessment covers 3%.
- **No free-text grading** — see `target-learning-model.md` on why Explain is unbuilt.
- **No item response calibration.** `responseLog` is collected for future IRT work; author-assigned difficulty is still provisional.
- **60 of 101 categorize keys are even sweeps in authored order.** Widening the display guard further would forbid 100% of the permutation space at 3 pairs, so these are recorded as content defects (ADR-011) rather than papered over with a stricter shuffle.
