# Engagement model

> Section 33. Generated from `facts.json`; `tests/facts.test.ts` fails on drift.

## The position

Engagement should come from feeling real progress and from retrieving knowledge, not
from manufactured mechanics. That rules out most of the usual toolkit, and the platform
follows it in one specific way worth naming: **the streak is deliberately forgiving**
(`forgiving: true`). The literature is clear that loss aversion drives
short-term engagement and long-term churn plus guilt, so a missed day does not zero the
counter.

## What the platform can estimate today

Section 33 asks the platform to estimate six things about a learner. Measured against
`Progress` (20 fields, one `localStorage` key):

| Question | Answerable | From |
|---|---|---|
| Which concepts they know | yes | `conceptsRead`, `checkpointScores` |
| Which they can apply | partly | `checkpointScores` — a graded gate is application; 10 Build challenges are the stronger signal and cover 6% of concepts |
| Which they are forgetting | yes | `reviews` — the 7-rung interval ladder |
| Which they get wrong **with confidence** | **no** | Captured in `responseLog.confidence` and used for the band cap and calibration gap, but **the review scheduler never reads it** |
| What kind of practice they need | partly | Mechanic is chosen by content authoring, not by learner history |
| When to re-expose | yes | `due` per concept |

The confident-wrong row is the interesting one. The data is collected, and
`scoring.ts` uses it to cap a band and compute a calibration gap — so it is not dead
in general. It **is** dead for scheduling, which is where section 33 wants it.

## Signal, not points

`signal` is the one numeric reward, and it is framed as competence feedback rather than
currency: there is no shop, no leaderboard, no multiplier. 35 checkpoints
gate progression at `max(0.85, (n-1)/n)` with a two-attempt cap, and the cap is
persisted — a page reload used to reset it, and within six reloads 28 of 35 checkpoints
cleared. Progress that can be refreshed into existence is not progress.

## What is missing

- **Saved content does not exist** (section 33.1). See `saved-content-model.md`.
- **The review queue draws on 1 of the 8 sources** section 33.2 names. See `retention-engine.md`.
- **No confidence prompt on checks** (`onChecks: false`) — only on assessment items, so 380 checks produce no calibration data.
- **Nothing is measured in aggregate** (0 tracking calls), so no claim here has been validated against learner behaviour.
