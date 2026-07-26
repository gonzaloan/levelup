# level-up — Should we reuse get-certified's Cognito + DynamoDB for cross-device sync?

**Date:** 2026-07-26
**Scope:** architecture evaluation only. No code, no infra changes.
**Account verified:** 201735383261 (`us-east-1`), read-only AWS CLI.

---

## Verdict

**DO IT LATER.** Specifically: **don't build sync now**, and when you do, **share the Cognito
user pool but do NOT share the DynamoDB table**.

Three reasons, in order of weight:

1. **There is no problem yet.** Sync solves "I studied on my phone, my laptop doesn't know."
   That is a real problem only for a learner who uses two devices *and* has enough accumulated
   state to care. level-up has one user (you). The cost of being wrong is asymmetric: a bad
   merge silently eats a 30-day streak, and there is no server-side history to restore it from
   (get-certified's Lambda does a blind `PutCommand` — no versions, no PITR, deletion
   protection off).
2. **The hard part is not AWS, it is the merge.** The infra reuse is genuinely cheap (~1 day).
   The merge semantics for level-up's state are *harder* than get-certified's, because level-up
   has two fields that do not union: `reviews` (a per-concept ladder where a wrong merge
   corrupts the schedule) and `signal` (a monotonic counter that double-counts under naive
   merge). See [The merge problem](#the-merge-problem). Getting that right is 3-5 days of
   careful, test-driven work — the streak module's own header comment is a monument to how
   easily day-keyed logic goes non-monotone.
3. **"No login required" is a stated product feature**, twice, in `README.md` and
   `docs/specs/2026-07-03-level-up-design.md`. Reusing the pool does not have to break that —
   get-certified's own `src/auth.js` is inert without config and login is optional there too —
   but it does add an auth surface to a product whose current pitch is "open the URL, start
   learning."

**What has to be true first:** (a) you actually use level-up on two devices for two weeks and
feel the loss; (b) `reviews`/`streak` merge is specified and unit-tested *before* any Lambda is
written; (c) the shared table question is settled as "separate table" so a level-up bug cannot
touch certification progress.

---

## What exists (verified against AWS, 2026-07-26)

### get-certified backend — real, deployed, and working

Stack `aws-study-guide` (CloudFormation), source of truth
`C:/Projects/Personal/get-certified/deploy/template.yaml`.

| Resource | Verified value |
|---|---|
| Cognito user pool | `us-east-1_66c0Pipcx` (`aws-study-guide-users`), tier ESSENTIALS, 4 users |
| Sign-in | email as username, auto-verified email, MFA **OFF**, min 8 chars, no symbols |
| App client | `4441463lq4uiptnrc2ugrbp0nk` (`aws-study-guide-web`), **no secret** (public client, PKCE) |
| OAuth | flow `code` only; scopes `openid email profile`; IdP `COGNITO` |
| Callback + logout URLs | `http://localhost:8000/`, `https://certs.skillrealm.dev/`, `https://dyd5xjzrfqt7j.cloudfront.net/` |
| Token TTLs | access 60 min, id 60 min, refresh **30 days**; token revocation enabled |
| Hosted UI domain | `getcertified-201735383261.auth.us-east-1.amazoncognito.com` — **ACTIVE**, managed login v1 |
| DynamoDB table | `aws-study-guide-progress`, **ACTIVE**, PAY_PER_REQUEST, 3 items / 3060 bytes |
| Key schema | `userId` (S) **HASH only — no sort key** |
| Table safety | `DeletionProtectionEnabled: false`, no PITR configured, no stream |
| HTTP API | `od9t6vzip0` → `https://od9t6vzip0.execute-api.us-east-1.amazonaws.com`, `$default` stage, autoDeploy |
| Routes | `GET /state`, `PUT /state`, both `AuthorizationType: JWT` |
| Authorizer | `CognitoJwt`, `$request.header.Authorization`, audience = the client id, issuer = the pool |
| CORS allow-origins | `https://certs.skillrealm.dev`, `https://dyd5xjzrfqt7j.cloudfront.net`, `http://localhost:8000` |
| Lambda | `aws-study-guide-sync`, nodejs24.x, arm64, 128 MB, 10 s timeout, handler `index.handler` |

### The "260-byte stub" warning in memory is STALE — the handler is real

I downloaded the deployed artifact and diffed it byte-for-byte against
`C:/Projects/Personal/get-certified/deploy/lambda/index.mjs`:

- deployed zip is **1588 bytes** (compressed) containing `index.mjs` (2801 bytes) + `package.json`
- `diff` against the local source: **IDENTICAL**
- last modified 2026-07-10T20:04:41Z

Live behavior confirms it: unauthenticated `GET /state` returns **401** (authorizer working),
CloudWatch shows **189 invocations in the 14 days to 2026-07-25 and 0 Errors**, log
durations 108-1027 ms (the ~1 s ones are cold starts with 253-338 ms init). No
`Runtime.ImportModuleError`, no `Task timed out`. **The redeploy that memory flags as pending
has already happened.** Update that memory entry.

### Two real findings, though

**1. The stored item is double-nested — a live schema wart.** The client sends
`body: JSON.stringify({ state: state })` (`src/auth.js` `apiPutState`) and the Lambda stores
`Item: { userId, state, updatedAt }` where `state` is *the whole parsed body*. A live scan
confirms the shape is:

```
{ userId: "...", updatedAt: "...", state: { state: { version: 1, certs: {...} } } }
```

`GET` returns `out.Item.state`, i.e. the outer `{state: {...}}`, and the client reads
`res.state` — so it round-trips correctly by accident. It works, but the contract is
"the API stores whatever object you PUT, and by convention you PUT `{state: <blob>}`".
Any second app wiring into this must replicate the same double-wrap or its reads break.

**2. CORS would silently block level-up today.** Preflight from
`https://levelup.skillrealm.dev` returns `204` but with **no** `access-control-allow-origin`
header, while the same preflight from `certs.skillrealm.dev` returns the header correctly.
The browser would reject every level-up call. This is a one-line template change
(the `CustomDomain` parameter takes a single value; a multi-origin list needs an
edit), but it is a required change, not free.

### level-up today — no backend at all

`C:/Projects/Personal/level-up/deploy/deploy.sh`: private S3 (`levelup-skillrealm-201735383261`)
+ CloudFront `EKDH4IJNSZLJQ` (alias `levelup.skillrealm.dev`, **Deployed**, live 200) + OAC +
a `cloudfront-js-2.0` viewer-request function `levelup-rewrite` + Route53 aliases in zone
`Z0821011BVH39BJ0FRT8`. Next.js `output: "export"`, `trailingSlash: true`. **No Lambda, no API,
no IAM role, no CloudFormation/SAM stack** — the script is imperative `aws` CLI calls.
Note this means level-up has no `template.yaml` to add resources to; a backend is a new
stack or a new set of hand-rolled CLI calls.

### level-up's progress shape

`C:/Projects/Personal/level-up/src/lib/store.ts` — one localStorage blob under `levelup.v1`,
loaded via `{...EMPTY, ...JSON.parse(raw)}` (so additive fields are forward-compatible),
saved wholesale, and every mutation goes through `update(fn)`. 16 files import it. It is
genuinely the single seam it claims to be: `load` / `save` / `update` are the only
localStorage touch points for progress, and `todayKey()` is the only clock read.

`Progress` fields, classified by merge behavior:

| Field | Kind | Merges cleanly? |
|---|---|---|
| `conceptsRead: string[]` | append-only set | **Yes** — union |
| `checkpointsCleared: string[]` | append-only set | **Yes** — union |
| `roomsCleared: string[]` | append-only set | **Yes** — union |
| `mastered: string[]` | append-only set | **Yes** — union |
| `skipped: string[]` | set, but **removable** via `unskipConcept` | **No** — union resurrects an unskip |
| `streak.days: string[]` | append-only day keys, sorted+deduped | **Yes** — union (and `streakSummary` already dedupes/sorts/filters future days) |
| `moduleScores`, `checkpointScores` | per-key best score | **Yes** — per-key `Math.max` |
| `gauntlets[id]` | `{firstScore, bestScore, attempts, clearedAt}` | **Partly** — `bestScore` max, `clearedAt` min-non-null, `firstScore` earliest-wins, **`attempts` genuinely conflicts** |
| `dailyLog: Record<day, DailyRecord>` | day-keyed, one writer per day per device | **Mostly** — per-key union; same-day-two-devices conflicts |
| `fieldWork: Record<id, {...}>` | per-key submission | **Mostly** — latest `submittedAt` wins |
| `reviews: Record<slug, ReviewState>` | **per-concept SM-2-like ladder** | **No** — see below |
| `signal: number` | **monotonic counter** | **No** — see below |
| `responseLog: Response[]` | append-only log with `ts` | **Yes** — concat + dedupe by `(itemId, ts)` |
| `assessment?: AssessmentResult` | single snapshot with `completedAt` | **Yes** — later `completedAt` wins |
| `cadence: {enabled, weeks[]}` | user setting + set | **No** — `enabled` is a boolean setting; LWW per field |
| `archetype?: string` | derived from assessment | **Yes** — follows `assessment` |

Note `unlockedThrough` (what gates the daily brief) is **derived**, not stored —
`src/lib/climb.ts` computes it from `mastered`/`checkpointsCleared`. That is good news:
merge the inputs correctly and the gate follows.

---

## The merge problem

This is the decision, not the infra. Two devices, both offline-first, both writing a whole blob.

### What merges cleanly

**Union** handles the four append-only sets and `streak.days`. `streak.days` is the best case
in the whole state: `markDay` is idempotent and sorted, `segmentRuns` judges each gap **only on
its own size** (the module explicitly chose that property for monotonicity), and
`streakSummary` already filters `d <= today` specifically to survive "a history merged from a
device in another timezone." The streak module was written for this merge before the merge
existed. Union it and it is correct.

**Per-key max** handles `moduleScores` / `checkpointScores`. `store.ts` already writes them
with `Math.max(score, prior ?? 0)`, so merge is the same operation.

### What genuinely conflicts

**`reviews` — the real hazard.** `ReviewState` is `{due, step, ease, reps, lapses, last}`, a
*path-dependent* ladder (`INTERVALS = [1,3,7,16,35,75,150]`, ease 1.3-2.8). There is no
field-wise merge that is semantically right:

- `max(step)` on both devices' independent `good` grades **inflates the interval**: two
  devices each climb one rung from step 2, you take 3 instead of the correct 3-after-one-review,
  and the concept vanishes from rotation for weeks it did not earn.
- `min(due)` is safe-but-lossy — it re-serves things you just reviewed, which is annoying
  but never loses knowledge.
- `max(reps)` is wrong (they're independent events); `sum(reps)` is wrong (double-counts if
  the same review synced twice).
- Worst case: device A grades `again` (step→0, due tomorrow), device B is stale at step 4.
  Blob LWW where B wins **erases the lapse** — you have forgotten the concept and the app
  will not show it to you for 35 days.

The honest fix is to stop merging *state* and merge *events*: store the graded reviews as an
append-only log of `{slug, grade, day}` and **replay** them through the existing pure
`schedule()` to rebuild `reviews`. `review.ts` is already a pure function of
`(prev, grade, today)`, so replay is free — this is the one design that is provably correct
and it is the reason to do this properly rather than quickly. But it is a state-shape change
(a new `reviewLog` field), which means it is not a "just add sync" project.

Pragmatic middle ground if you don't want event sourcing: **per-slug, take the state whose
`last` day key is greater; tie-break to the one with the lower `step`** (pessimistic — a tie
means re-review, never skip). Lossy in interval length, never lossy in knowledge. Acceptable.

**`signal` — a counter, not a value.** `signal` is `p.signal + delta` in six call sites
(`awardSignal` from `FieldWorkView`, `RoomPlayer`, `TodayView`; plus `masterModule` +20,
`recordCheckpoint` +30, `recordGauntlet` +40, `completeDaily` +10). Under merge:

- `max(signal)` **loses** whichever device earned less — real work vanishes from the number.
- `sum(signal)` **double-counts** on every re-sync (the same push merged twice inflates forever).

The right answer is that `signal` should not be stored at all: it is **derivable** from the
merged sets (mastered × 20 + checkpointsCleared × 30 + gauntlets cleared × 40 + streak.days ×
10 + the awardSignal grants). Only the three `awardSignal` grants
(field work, rooms, daily checks) aren't reconstructible today, and two of those *are* keyed
(`fieldWork[id]`, `roomsCleared`) so they could be. Recompute `signal` after merge from the
merged inputs and the conflict disappears — but again, that is a change to how `signal` works,
not a sync feature.

**`skipped` — union is wrong.** `unskipConcept` removes a slug. Union resurrects it, so a
concept you deliberately un-set-aside comes back and the daily brief stops serving it. Needs
a tombstone (`skipped: Record<slug, {at: number, active: boolean}>`) or accept per-device
divergence. Low stakes, but it is a silent wrong answer.

**`gauntlets[id].attempts`** genuinely conflicts (2 devices × 3 attempts = 6? 3?). Low
stakes — it's a display counter. Take the max and move on.

**Same-day `dailyLog[today]`** conflicts if you complete a brief on two devices the same
day (possible: `buildDaily` is deliberately deterministic per `(day, state)`, so both devices
serve the *same* concept, which is what makes this collision likely rather than rare).
Prefer the record with `checkPassed: true`, then the higher `reviewsDone`.

### So: is last-writer-wins-blob acceptable?

**No.** It would silently lose a day's work in the ordinary case, not an exotic one. Concretely:
study on your phone in the morning (concept read, brief completed, streak day added, 3 reviews
graded), then open the stale laptop tab in the evening — its debounced push overwrites the
morning. `conceptsRead` loses a slug, `streak.days` loses today (breaking a run), `reviews`
rolls back three schedules, `signal` drops 25. Nothing warns you, and there is no server-side
history to recover from. get-certified avoided this by writing a real union merge
(`mergeState` in `src/auth.js`, ~120 lines of hand-written per-field merge with comments
recording two prior data-loss bugs it had to fix: `pos` being dropped, and `mergeExams`
discarding a whole array by length). level-up's state is **harder** than that, because
get-certified's state is almost entirely booleans and maxima — it has no `reviews` ladder and
no free-floating counter.

That asymmetry is the core finding of this evaluation: **the infra is reusable, the merge is not.**

---

## The design, if adopted

### Cognito: share the pool. Yes.

One pool, **one additional app client**. Do not reuse the `aws-study-guide-web` client.

| Change | Where | Why |
|---|---|---|
| New app client `levelup-web` | `template.yaml` (get-certified stack) or a `AWS::Cognito::UserPoolClient` in a new level-up stack pointing at the existing pool id | Callback URLs are per-client. A separate client keeps level-up's redirect URIs, TTLs, and revocation independent, and lets you kill level-up's access without touching certs. |
| Callbacks/logout: `https://levelup.skillrealm.dev/`, `http://localhost:3000/` | new client | level-up dev runs on **3000** (`next dev`), not get-certified's 8000. |
| OAuth flows/scopes | `code` + `openid email` | Same as get-certified; PKCE public client, no secret. |
| Hosted UI domain | **no change** — `getcertified-201735383261...` is shared per-pool | Cosmetic wart: level-up users see a "getcertified" URL and get-certified branding (`deploy/cognito-ui/` sets the pool's logo/CSS, which is pool-wide, not client-wide). Fixable only by moving to a Cognito **managed login branding** style per client, or accepting it. |
| API authorizer audience | add the new client id to the JWT authorizer's `audience` list | Otherwise level-up's tokens are rejected. It's a list; both ids can coexist. |
| HTTP API CORS | add `https://levelup.skillrealm.dev` + `http://localhost:3000` | **Required** — verified blocked today. |

**Is a single pool a bad idea?** No, and there is a positive argument for it: skillrealm.dev is
explicitly an umbrella brand with subdomain-per-product, so one identity across
`certs.` and `levelup.` is the *right* product behavior — sign in once, be the same learner.
The `sub` is the same in both apps, which is exactly what you want. Caveats, all minor:
MFA is OFF and the password policy is weak-ish (8 chars, no symbols) pool-wide, so level-up
inherits that; and a pool-wide setting change (e.g. enabling MFA, adding a PreSignUp trigger
to restrict sign-ups) now affects two products. Acceptable for a personal project.

### DynamoDB: do NOT share the table. Separate table.

The question asked which of two shared-table shapes I'd pick. If forced to share, the answer is
**one item per (sub, app)** — i.e. add a sort key:

```
PK: userId (S)  = Cognito sub
SK: app    (S)  = "certs" | "levelup"
attrs: state (M), updatedAt (S), schemaVersion (N)
```

Why that over "PK `sub` + one attribute per app": with an attribute-per-app, a `PutCommand`
(which is what the existing Lambda does — a full-item overwrite, not an update expression)
**deletes the sibling attribute**. get-certified's handler would wipe level-up's progress on
its very next push, and vice versa. You'd have to rewrite it as an `UpdateCommand` with
`SET #app = :state`, and now a bug in either app's client — or an accidental deploy of the old
`PutCommand` code — is a total loss of the other app's data. Item-per-(sub, app) confines each
app to its own item; even a blind `Put` can only destroy its own row.

**But I'd still use a separate table**, `levelup-progress`, because sharing buys nothing and
costs real things:

- **What sharing buys: nothing measurable.** Table count is not a cost. Billing is
  PAY_PER_REQUEST; two empty-ish tables cost the same as one (~$0, free tier). There is no
  query that spans both apps. There is no join.
- **Blast radius.** Adding a sort key to `aws-study-guide-progress` is **not possible in
  place** — DynamoDB key schema is immutable. Sharing means *creating a new table, migrating
  the 3 live items, and rewriting + redeploying get-certified's Lambda and client contract*.
  That is a change to a **working, 189-invocations-in-14-days, zero-error production path
  that holds your actual certification progress**, in service of a feature for an app that
  has no users. Deletion protection is off and there is no PITR; a botched migration is
  unrecoverable.
- **Schema coupling.** Sharing the table means sharing the handler, which means sharing the
  `{state: {state: ...}}` double-wrap wart and every future change to it. level-up wants a
  different contract anyway (see below).
- **IAM.** Separate tables let each Lambda's `DynamoDBCrudPolicy` scope to exactly one table.
  Shared, both roles can read/write both apps' items unless you add
  `dynamodb:LeadingKeys` condition keys — more IAM than a side project should carry.

**Separate table, and take the chance to fix two things** the existing contract got wrong:

```
Table levelup-progress
  PK: userId (S)          = Cognito sub
  attrs:
    state (M)             = the levelup.v1 blob, NOT double-wrapped
    schemaVersion (N)     = 1     ← version the blob so a future shape change is detectable
    revision (N)          = monotonic, incremented server-side
    updatedAt (S)
  PAY_PER_REQUEST
  PointInTimeRecoverySpecification: enabled   ← 35-day restore; the thing that makes a
                                                merge bug survivable
  DeletionProtectionEnabled: true
```

Add **optimistic concurrency**: `PUT` sends the `revision` it read; the Lambda does a
`ConditionExpression: attribute_not_exists(revision) OR revision = :expected`, returns
**409 + the current item** on mismatch, and the client re-merges and retries. This is a
~10-line addition to the copied handler and it is what turns "two devices race" from silent
loss into a detected, recoverable event. get-certified's handler has no such guard — copy the
shape, not the omission.

Then reuse everything else by copy: `template.yaml`'s HTTP API + JWT authorizer + Lambda
pattern is directly transplantable into a new small SAM stack for level-up (which also gives
level-up the `template.yaml` it currently lacks). The static-site half of level-up's
`deploy.sh` stays as-is.

---

## What level-up would actually have to build

Honest sizing. This is not "wire up an existing backend."

| # | Work | Size | Notes |
|---|---|---|---|
| 1 | **New SAM stack** (`deploy/template.yaml`): DynamoDB table, Lambda, HTTP API, JWT authorizer, IAM | 0.5 day | Copy from get-certified. Genuinely cheap. |
| 2 | **Lambda handler** `GET/PUT /state` + optimistic concurrency (409) | 0.5 day | ~100 lines. Copy + add the condition expression. |
| 3 | **Changes to the get-certified stack**: new app client, authorizer audience list, CORS origins | 0.5 day | Touches a working prod stack — needs care and a verify pass. The `CustomDomain` parameter is single-valued today, so the multi-origin CORS/callback lists need a small template refactor. |
| 4 | **Auth UI in React/Next** | 1 day | get-certified's `auth.js` is 623 lines of vanilla ES5 IIFE with a hand-rolled PKCE flow, hand-built DOM for the button and the confirm-logout dialog, and manual `whenTopbarReady` polling. **None of that ports** to a Next.js 15 / React 19 static export. You rewrite: PKCE (crypto.subtle — portable, ~40 lines), the `?code=` callback handler as a client component or route, token storage, a sign-in button, a signed-in state in the header. Note the static export has no server, so the OAuth redirect must land on an exported route and be handled client-side. |
| 5 | **Token refresh path** | 0.5 day | 60-min id_token, 30-day refresh. Port `validIdToken()`'s "fresh? else refresh, preserve refresh_token" logic. Straightforward but must not lose the refresh token (get-certified explicitly re-attaches it because Cognito doesn't reissue it). |
| 6 | **Merge strategy + tests** | **3-5 days** | The actual project. Per-field merge for 16 fields, of which 4 genuinely conflict. Needs the same rigor `daily.ts` already got. Property tests: merge is commutative, associative, idempotent (`merge(a,a) == a`), and never decreases `streak.days`, `conceptsRead`, or `total`. This is where a rushed job costs you a streak. |
| 7 | **`store.ts` seam changes** | 1 day | `save()` must notify a sync layer (it already dispatches a `levelup:progress` CustomEvent — that's the hook, and it's already there). A `pullAndMerge()` on boot must re-render; in React that means the 16 consumers need to react to a state replacement, which they may or may not already do via the event. Plus possible shape changes if you adopt `reviewLog` (#6) or derived `signal`. |
| 8 | **Deploy script + config injection** | 0.5 day | level-up has no `config.js` equivalent; needs a build-time or deploy-time injection of pool/client/api ids into the static export (Next `env` or a generated file). |
| 9 | **Verification** | 1 day | Two-browser-profile manual test of the actual conflict scenarios, not just "login works." Playwright can't easily fake two devices; this is hand-testing. |

**Total: 8-11 days of careful work**, of which the AWS reuse is ~1.5 days and the merge is
half the project. For a one-person side project with no users, that is the number to weigh
against "I'd like my phone and laptop to agree."

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Silent data loss via bad merge** | **High** | The whole reason for the verdict. Mitigate with PITR on the new table, optimistic concurrency (409), and property tests before shipping. Never LWW. |
| **Regressing get-certified's working sync** | **Medium-high** | Step 3 edits a live stack holding your real cert progress; a shared table (rejected above) would make this much worse. Keep changes additive: new client, appended audience, appended CORS origins. Snapshot the 3 items before touching anything. |
| **No recovery path** | **Medium** | Verified: `DeletionProtectionEnabled: false` and no PITR on `aws-study-guide-progress` today. Enable both there too — it's free-tier-adjacent and one template line. |
| **`reviews` corruption is invisible** | **Medium** | A wrong `step` doesn't error; the concept just stops appearing. Nothing in the UI would tell you. Consider a "reviews forecast looks wrong" sanity check, or the event-log/replay design which cannot drift. |
| **400 KB DynamoDB item limit** | **Low-medium** | Current get-certified blobs are ~1 KB. level-up's grows: 178 concepts × `ReviewState` ≈ 16 KB, `dailyLog` ≈ 44 KB/year, `responseLog` unbounded (`[...p.responseLog, ...finalResponses]` never truncates). Years out, not now — but `responseLog` is the one field with no cap and it exists only "for future IRT calibration." Cap it (get-certified caps `exams` at 25 for exactly this reason) or exclude it from sync. |
| **Auth surface on a "no login" product** | **Low** | get-certified's inert-without-config pattern is the right precedent: sync is strictly opt-in, the app is byte-identical for anonymous users. Keep that. |
| **Shared hosted-UI branding** | **Low** | level-up's login page will say `getcertified-...` and show get-certified branding. Cosmetic; a real fix means per-client managed-login branding. |
| **Cognito ESSENTIALS tier is not free forever** | **Low** | Pool is on ESSENTIALS with 4 users; MAU-priced above the free tier. Two apps on one pool share the MAU count, which is actually *cheaper* than two pools. |
| **Token in localStorage (XSS)** | **Low** | Inherited tradeoff, documented at `src/auth.js:63-76`. level-up is authored static content, same risk profile. A CSP response-headers policy on the CloudFront distribution is the mitigation, still unapplied in both apps. |

---

## The cheap alternative, if the real need is "my two devices disagree"

Before 8-11 days of sync: **export/import a JSON file**. `store.ts` is already a single
serializable blob with a stable key and a forward-compatible loader
(`{...EMPTY, ...parsed}`). A "download my progress" button plus a "restore from file"
input is **half a day**, needs no AWS, no accounts, no merge, and preserves "no login
required" exactly. It doesn't sync continuously — but it does solve "I got a new laptop"
and "I want a backup," which is often the actual felt need behind the sync ask, and it
loses nothing because the human decides which copy wins.

If after that you still feel the two-device friction weekly, build the real thing —
shared pool, separate table, event-replayed reviews, derived signal.

---

## Summary of the three answers

1. **Same DynamoDB table?** Technically yes, as one item per `(sub, app)` with a sort key —
   never as attribute-per-app on a shared item, because the existing handler's blind
   `PutCommand` would delete the sibling app's data. But **don't**: DynamoDB key schemas are
   immutable, so sharing forces a migration of a working production table for zero measurable
   benefit. Use a separate `levelup-progress` table.
2. **Same user pool?** **Yes** — add a `levelup-web` app client (callbacks
   `https://levelup.skillrealm.dev/` + `http://localhost:3000/`), append its client id to the
   HTTP API's JWT authorizer audience, and add level-up's origins to CORS (**verified broken
   today** — preflight from `levelup.skillrealm.dev` returns no allow-origin header). One
   identity across skillrealm subdomains is the correct product behavior. Only real downside is
   shared hosted-UI branding and pool-wide security settings.
3. **What level-up must build?** A SAM stack it doesn't have, a Lambda it doesn't have, a
   React auth UI (get-certified's 623-line vanilla IIFE does not port), a token refresh path,
   and — the actual work — a merge strategy for state where `reviews` and `signal` do not merge
   by any field-wise rule. ~8-11 days, half of it merge.

**Verdict: DO IT LATER.** Ship export/import now (half a day, no accounts, keeps the
no-login promise). Build sync when two-device friction is real, and when it is, share the
pool, not the table.
