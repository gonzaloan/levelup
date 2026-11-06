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
- `content/domains.json` — the 12 topics, their order and the ordered concept ids (the syllabus).
- `content/concepts/<domain>/<id>.json` — one concept per file. Schema: `src/lib/types.ts`.
  Authoring rules and limits: `docs/AUTHORING.md`. Gold example: `content/concepts/rag/reranking.json`.
- `content/diagrams/<id>.{dark,light}.svg` — pre-rendered diagrams (generated, committed; each file
  starts with a hash of its source, so stale ones fail the build).
- `tools/content-lib.mjs` — the validator (single source of truth for the content contract).
- `tools/build-content.mjs` — the gate; also writes `src/generated/` (search + practice indexes,
  gitignored, regenerated on dev/build).
- `src/lib/` — content loading (server-only), search, i18n, markdown, highlighting, progress.
- `src/app/[locale]/` — routes: `/`, `/d/[domain]`, `/c/[id]`, `/cheatsheet`, `/interview`,
  `/questions`, `/practice`.

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
- **Derive counts from the data**, never hardcode them.

## Content fleets (if you author many concepts with sub-agents)
- Give each agent ≤5 concepts, the brief, and the rule to Write one file per concept and run the
  validator. Forbid Skill/WebSearch/WebFetch (AI-topic text triggers skills; sources from memory are
  then link-checked).
- Then run a review pass per domain for factual errors, then `npm run links`.

## Deploy
The owner deploys (`deploy/README.md`). Prepare code and a runbook; don't run the deploy.
