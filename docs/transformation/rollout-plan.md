# Rollout plan

> Section 20. Generated from `facts.json`.

## Deployment reality

Static export, 21 page routes, no server, no auth, no database. A release is
a directory of files behind a CDN. That constrains the rollout in a way worth stating
plainly: **there is no server-side flag, no cohort split, and no way to serve two
versions to two learners.** Anything resembling a canary has to be client-side.

**The owner deploys.** This repo prepares code and a runbook; it does not push.

## Gate before any deploy

```bash
npm run verify        # 6 steps: typecheck, lint, 10 validators, 3 self-tests, 336 tests
npx playwright test --workers=1   # 89 browser tests
npm run build         # must produce the full page set
```

All three must pass. `--workers=1` is not optional: the specs share `localStorage`
state.

## Sequence

**Stage 1 — behind the flag.** `ROUTES_ENABLED = false` ships the content and engine
changes with the old `/learn`. Everything except the route shell is live and reversible
by a git revert.

**Stage 2 — flag on.** One line in `src/lib/flags.ts`. The route picker appears; no
stored progress changes meaning.

**Stage 3 — content depth.** The gaps in `target-learning-model.md`:
154 concepts still need a Predict step,
172 need a Build challenge. Each is additive and
independently shippable.

## Rollback

| Failure | Action | Cost |
|---|---|---|
| Route shell is wrong | `ROUTES_ENABLED = false` | One line, one deploy |
| A content defect | Revert the JSON commit | Content only; progress untouched |
| A check is unfair | Revert; `checkpointScores` keeps prior clears | No learner loses a clear |
| Total | Redeploy the previous export | Full, because a release is just files |

Every stored-progress field added is optional, so no rollback needs a data migration.

## Risks

- **No visual regression baseline.** A CSS regression that keeps the DOM intact passes all 89 browser tests. Highest residual risk.
- **No telemetry.** With 0 tracking calls, a rollout is judged by looking. If the route split confuses learners, nothing reports it.
- **The attempt cap will read as a restriction** to anyone who had been refreshing to re-roll a checkpoint.
- **4.1 MB of assets** with no CI budget.

## After the deploy

Walk the 3 routes in both locales and
both themes; clear one checkpoint; fail one twice and confirm the cap holds across a
refresh; open `/build` and confirm the answer key is not printed. Those are the four
defects that were most expensive to find, so they are the four worth re-checking by hand.
