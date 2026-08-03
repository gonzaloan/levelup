# Migration map

> Section 20. Generated from `facts.json`.

## Shape of the change

The transformation adds a route layer on top of an existing spine. It does not move
content between files, and it does not rename a slug — so there is no data migration and
no redirect table. `hasRedirects: false` in `next.config.mjs`, and that is
correct rather than a gap.

21 page routes ship. `trailingSlash: true` with
`output: "export"`, so every URL is a directory with an `index.html`.

## What changed, and what a returning learner sees

| Change | Learner-visible effect | Their stored progress |
|---|---|---|
| Route model (3 routes, 13 stages) | A new picker at `/learn`; the old ladder still resolves | Untouched — routes read existing `checkpointsCleared` |
| `poolFor()` graded/practice split | Practice checks differ from checkpoint checks | Untouched; past scores stay valid |
| Per-attempt display shuffle | A retry shows a different arrangement | `checkpointAttempts` is a new field, absent = 0 |
| `showDetail` gating | Graded surfaces no longer reveal per-element marks | No effect |
| Attempt cap persisted | F5 no longer resets the cap | New field; a learner mid-checkpoint starts at 0 attempts |
| `leansOn` (37 edges) | Foundations surface where a concept needs them | Advisory only, never gates |
| Predict step (24 concepts) | A commitment before the teaching | Unscored, so nothing to store |

## Backward compatibility of stored progress

One `localStorage` key, 20 fields. Every field added by this
transformation is optional and defaults to empty, so a learner returning with an old
`Progress` object loses nothing. `tests/backup.test.ts` covers the round trip.

The one behavioural change worth naming: **the attempt cap now survives a refresh.** A
learner who had been re-rolling a checkpoint by pressing F5 can no longer do that. That
is the defect being fixed, and it will read as a restriction.

## Rollback

Every change is additive. `ROUTES_ENABLED` in `src/lib/flags.ts` turns the route shell
off and restores the previous `/learn`, without touching content or stored progress.
Content changes are in `src/content/data/*.json` and revert with git; no schema
migration has to be undone.

## Not migrated

- **154 concepts have no Predict step** and 172 have no Build challenge. The engines exist; the content does not.
- **Explain and Transfer do not exist** — see `target-learning-model.md`.
- **No analytics migration**, because there is no analytics.
