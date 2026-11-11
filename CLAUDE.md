# levelup — AI Architect Field Guide

A bilingual (ES/EN) study guide and interview cheatsheet for Staff/Principal AI Architects.
Static Next.js export, content-as-data, no backend, no tracking. Read this before changing anything.

## The product, in one line
Every concept on one page, in the same order: one-sentence TL;DR → how it works → diagram → code →
real example → trade-offs → numbers → pitfalls → interview Q&A → related → sources.
Simple and concise beats exhaustive. If a field needs scrolling to read, it is too long.

## Run & verify
- `npm run dev` — local dev (tolerates concepts that are not written yet).
- `npm run verify` — **the gate**: content validation + typecheck + lint + unit tests.
- `npm run build` — strict content gate, then static export to `out/`.
- `npm run diagrams` — re-render Mermaid → SVG (needs Chromium; outputs are committed).
- `npm run links` — source-URL liveness (curl; 403s from bot-blocking sites are reported apart).
- `npm run e2e` — Playwright smoke tests against `out/` (build first; always `--workers=1`).
- `node tools/check-concept.mjs --mermaid <files>` — validate specific concept files.

## Where things live
- `content/domains.json` — the topics, their order and the ordered concept ids (the syllabus).
- `content/architecture-map.json` — the clickable reference-architecture map (`/map`): layers +
  cross-cutting bands, each a list of concept ids (validated by the content gate).
- `content/path.json` — the study path (`/path`): 3 phases → modules → every concept exactly once,
  in learning order (the gate fails on a missing or duplicated concept).
- `content/exercises/<domain>/<id>.json` — authored practice items per concept (rules:
  `docs/EXERCISES.md`, gold: `content/exercises/rag/reranking.json`, validate with
  `node tools/check-exercises.mjs`). The build adds auto items: "which concept is this?",
  "rebuild the diagram" (from `content/diagrams/<id>.graph.json`) and interview flashcards.
- `content/concepts/<domain>/<id>.json` — one concept per file. Schema: `src/lib/types.ts`.
  Authoring rules and limits: `docs/AUTHORING.md`. Gold example: `content/concepts/rag/reranking.json`.
- `content/diagrams/<id>.{dark,light}.svg` — pre-rendered diagrams (generated, committed; each file
  starts with a hash of its source, so stale ones fail the build).
- `tools/content-lib.mjs` — the validator (single source of truth for the content contract).
- `tools/build-content.mjs` — the gate; also writes `src/generated/` (search + practice indexes,
  gitignored, regenerated on dev/build).
- `src/lib/` — content loading (server-only), search, i18n, markdown, highlighting, progress.
- `src/app/[locale]/` — routes: `/`, `/path`, `/map`, `/d/[domain]`, `/c/[id]`, `/cheatsheet`,
  `/interview`, `/questions`, `/practice`, `/practice/play?mode=…`. `/auth` is the OAuth callback.
  `src/app/sitemap.ts` + `robots.ts` are generated statically.
- `src/lib/practice/` — the practice engine, pure and unit-tested: graders, seeded shuffles, FSRS
  state (ts-fsrs), sessions, XP/levels/streak, union `merge` for sync.
- `src/lib/sync.ts` — optional login + sync, reusing get-certified's Cognito user pool. Inert
  without `NEXT_PUBLIC_*` config (see `.env.example`, `deploy/sync-config.sh`). The browser writes
  its own item in a PROVISIONED DynamoDB table via an identity pool (no API, no Lambda): the
  server side is `deploy/get-certified/levelup-sync.diff`.

## Rules
- **Edit content as JSON, then validate.** Never hand-edit `content/diagrams` — run `npm run diagrams`.
- **Both languages, always.** Spanish is authored (neutral LatAm, `tú`), not machine-literal.
  Diagrams and code are shared; diagram labels are English.
- **Facts must be real.** The reader repeats this in interviews. No invented figures; `~` for
  approximations; prices carry a date or are labelled as assumptions.
- **Zero JS for content.** Diagrams are static SVG, code is highlighted at build time (shiki).
  Client JS only for search, theme, progress, filters, practice.
- **Search and practice indexes load lazily** (`import()` of `src/generated/*.json`), never inlined
  into every page.
- **localStorage only for per-reader convenience** (theme, mastered, practice boxes), every access in
  try/catch.
- **Two themes** via `[data-theme]` on `<html>`; every color is a token in `globals.css`. Per-domain
  color is `--h` (oklch hue) from `src/lib/hue.ts`.
- **Derive counts from the data**, never hardcode them (the e2e suite reads `domains.json`; domain
  hues are spread evenly from the domain count in `src/lib/hue.ts`).
- **Same shape everywhere.** Every concept has the same sections in the same order; the validator
  enforces it. A field that doesn't add value is left out, never padded.

## Practice rules (learning science + integrity)
- **Retrieval practice + spacing** are the core (FSRS, target retention 0.9). Confidence is asked
  before checking: a correct guess schedules as Hard, not Good.
- **Grade on ORIGINAL indexes, display in a seeded shuffle** (`src/lib/practice/rng.ts`, seed =
  item + reps). Authored content tends to put the right answer first; order/match displays use
  `derange` so the authored order never shows as-is. A 2-pair match is solvable by elimination:
  the validator requires ≥ 3 pairs.
- **The correct option must not be the visibly longest** (validator warns at 1.6×).
- Exercises take facts only from their concept file; never a new statistic.
- The streak forgives one missed day per rolling week: punishing a single bad day teaches people
  to quit.

## Content fleets (if you author many concepts with sub-agents)
- Give each agent ≤5 concepts, the brief, and the rule to Write one file per concept and run the
  validator. Always forbid the Skill tool (AI-topic text triggers skills).
- Let authors use WebSearch/WebFetch **only to verify** specific figures, dates and URLs. Authoring
  from memory alone needed a full second review pass: it found stale specs (MCP, A2A, OWASP 2026),
  deprecated model ids, moved docs URLs and misattributions in every one of 12 domains.
- Then `npm run links`, and a per-domain review for anything authored without verification.
- AI facts go stale in months: date every price, spec version and product status.

## Cost ceiling
**AWS spend for levelup must never exceed $5/month, worst case included** (owner's rule). Bound it
by construction, not by alarms: fixed provisioned capacity, no autoscaling, no pay-per-request
service a browser can call (API Gateway, Lambda, on-demand tables), CloudFront on the Free
flat-rate plan. State the worst-case math before adding any AWS resource.

## Deploy
The owner deploys (`deploy/README.md`). Prepare code and a runbook; don't run the deploy.
