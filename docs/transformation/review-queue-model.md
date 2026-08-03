# Review queue model

> Section 33.2. Generated from `facts.json`. The queue's current state is documented in
> `retention-engine.md`; this file specifies the target.

## Target composition

A queue that mixes 10 signals, ranked, capped at
3 items per brief so a session stays finishable.

| Priority | Source | Why it ranks there | Built |
|---:|---|---|---|
| 1 | Wrong with **high** confidence | A confidently wrong belief is actively harmful and will be acted on | **no** |
| 2 | Concepts near forgetting | The interval ladder's whole purpose | yes |
| 3 | Recent mistakes | Freshest evidence of a real gap | **no** |
| 4 | Correct with **low** confidence | Knows it, does not trust it — cheap to convert | **no** |
| 5 | Weak prerequisites | A shaky foundation makes the next concept fail for the wrong reason | **no** |
| 6 | Knowledge the active module needs | Just-in-time beats just-in-case | **no** |
| 7 | Saved concepts | The learner asked | **no** |
| 8 | Unreviewed for too long | Catches what the ladder's ease multiplier pushed too far out | **no** |

Confident-wrong ranks first because it is the only entry where **not** reviewing does
active damage. Everything else is knowledge fading; this one is knowledge that is wrong
and trusted.

## Ranking rules

- **Cap at 3.** A queue that grows without bound is a queue that gets abandoned; the streak is forgiving for the same reason.
- **Never two items from the same concept in one brief.** Repetition inside a session measures short-term memory.
- **Deterministic order for a given day and state.** No `Math.random()`, no `Date.now()` — the app is a static export and a non-deterministic render breaks hydration parity.
- **A review is not a re-read.** It must be a check or a scenario, because re-reading produces the fluency illusion.

## Why the current implementation is 1 of 10

Two sources are cheap and unbuilt (confident-wrong and recent mistakes — the data is
already in `responseLog`), two need features that do not exist (saved content, an
active module), and two need new signals to be recorded (prerequisite strength,
last-seen age).

The measured figure was **3 of 8 until the detectors were corrected**; both errors
flattered the implementation. That correction is documented in `gen-facts.cjs` and is
the reason this document reports 1.
