# level-up — project conventions

The definitive, bilingual, gamified guide to reach Staff/Principal engineer. Next.js static
export, content-as-data, dark-only with two themes. This file orients any future session; read it
before making changes.

## Run & verify
- **`npm run verify` — the gate.** typecheck, lint, 7 content validators, both gate self-tests,
  then vitest. If this is green the tree is shippable except for the browser layer.
- `npm run dev` — local dev.
- `npm test` — vitest (node env, pure-logic tests only; no jsdom → no React-render tests).
  Source-reading tests (`a11y-source`, parts of `check-integrity`) exist BECAUSE of that limit:
  they cannot prove a glyph is visible, only that the JSX contains it. Playwright covers the rest.
- `npm run build` — static export to `out/` (this is the real integration check).
- `npx playwright test --workers=1` — visual/e2e. **Always `--workers=1` (or 2)**: the static
  `serve` can't handle 8 parallel workers and gives spurious timeouts.
- `npx tsc --noEmit` and `npx next lint --dir src` — must stay clean.

## Structure
- `src/app/` — routes (`/[locale]/…`), `layout.tsx`, `globals.css` (only `@import`s of `styles/*`).
- `src/app/styles/*.css` — the design system, one concern per module; **import order = cascade order**.
- `src/components/` — UI. Sub-areas: `lesson/`, `checks/`, `viz/` (interactive concept widgets).
- `src/lib/` — logic (see `src/lib/README.md` for the domain/data/shared map).
- `src/content/data/*.json` — the content-as-data (curriculum, lessons, checks, resources). Large;
  edit via the validating merge scripts in `tools/`, never by hand:
  - `merge-domain.cjs` — a whole domain into the spine (validates prereq DAG, no cycles, no
    forward references, bilingual, no calques).
  - `merge-checkpoints.cjs` — checkpoints (exactly one correct option, concepts in the right band).
  - `merge-lessons.cjs` — lessons (diagram shape must match its `kind` or it renders empty;
    `architecture` must not restate `diagram`; widgetId must exist in the viz registry).
  - `merge-resources.cjs` + `apply-resource-map.cjs` — the reading list and its concept mapping.
  - `merge-codex.cjs` — the Codex reference (`codex.json`). Assembles authored micro-batches into
    clusters via the `BATCH_CLUSTER` map (which is the reference's table of contents — an editorial
    decision, deliberately not left to whichever agent wrote the batch), validates the entry DAG is
    acyclic, that `relatedConcepts` name real spine slugs, and that every `cost` is a bound or a
    figure rather than an adjective. Skips files starting with `_`.
  - `patch-codex.cjs` — surgical field patcher for authored Codex batch files. Fills a hole at an
    exact dotted path; refuses to invent structure.
  - `assemble-lesson.cjs` — stitches per-batch authored partials into one lesson.
  - `check-links.mjs` — link liveness. A 200 is NOT enough: it also fails a redirect that lands off
    the article (a "working" link that delivers nothing).
  - `check-prose.cjs` — the prose gate (below). `--audit` for the full report, `--baseline` to reset
    the ratchet.
  - `merge-checks.cjs` — knowledge checks. Validates every index in range, both languages really
    translated (the measured EN/ES function-word skew, not a diacritic count), and refuses a match
    under 3 pairs. `selftest-merge-checks.cjs` replays 16 defect classes against it plus a
    known-good fixture, because a validator that passes everything and one that checks nothing
    produce the same output.
  - `check-coverage.cjs` — every domain owes its learners the same mechanics. Derives the matrix
    from the spine. Exists because `cloud-platform` shipped with 0 of 290 checks and no validator
    could see it: they all check that what EXISTS is well-formed, and a domain with zero checks is
    well-formed. Baseline in `coverage-baseline.json`, with a reason per line.
  - `check-refs.cjs` — every id the content points at must resolve: diagram registry, viz registry,
    literal `public/` paths, and the badge/OG cards derived from the spine. Found 16 dead diagram
    ids in `ai-l5.json` that rendered nothing (`Diagram` returns `null` on a miss), a missing
    `/hero/codex.webp`, and the 7th domain's OG card, whose absence 404'd its LinkedIn share.
  - `inventory.cjs` + `audit.cjs` — the transformation's reproducible content inventory (470 units)
    and its 0–4 rubric scoring. `selftest-inventory.cjs` (25 checks) guards both detectors.
  - `gen-og.mjs` — renders an achievement's 1200×627 share card. Reproducible replacement for the
    one-off pass that produced 16 of 17 and left the 7th domain's out.
  Each takes `--check` to validate what is already shipped.
- `src/i18n/` — locales + the UI message catalog (`messages.ts`).
- `docs/specs/`, `docs/superpowers/plans/` — design specs and implementation plans.
- `research/` — throwaway working area (fleet inputs, SD experiment). Largely gitignored.

## Core patterns (follow these)
- **Bilingual**: every learner-facing string is `I18nText` (`{en,es}`); render with `t(text, locale)`.
  UI chrome uses `m(key, locale)` from `messages.ts`. Spanish is **authored, never machine-translated**
  (correct `¿¡ñ` + tildes, no calques — "compensación" for tradeoff, "confiable" not "robusto").
- **Two themes**: Studio (default, observatory/instrument) and Pixel (`[data-theme="pixel"]`,
  Mario-3 overworld + DawnBringer palette, zero-radius hard-shadow frames). Both are first-class in
  every component; test both.
- **Motion**: transform/opacity only, double-gated on `prefers-reduced-motion`, with a static
  fallback. Content is **visible by default** / armed-on-JS — never `opacity:0` as the default
  (it hides below-fold content in no-JS + screenshots; learned the hard way).
- **Determinism**: never `Math.random()` / `Date.now()` at runtime — seed (SSR/hydration parity).
- **Content-as-data**: teaching content lives in JSON conforming to `src/lib/types.ts`; the schema
  is additive (old renderers ignore unknown fields). Pure-domain `lib` modules stay React-free.
- **Assessment integrity**: `scoring.ts` is the honest engine — don't casually change it. Graded
  checks resolve to a boolean and feed the same gate as MCQs; formative checks never score.
  **Option order is shuffled at render** (`src/lib/shuffle.ts`, seeded by a stable item key, never
  random): the authored JSON puts the correct answer first in ~97% of items, which made every quiz
  clickable without reading. Any new quiz surface MUST shuffle, and must key state/grading off the
  ORIGINAL index — never the display position.
  **The four novel mechanics shuffle through `src/lib/checkDisplay.ts`, and shuffling alone is not
  enough.** Their authored keys are the identity permutation (63/73 match, 58/61 cloze, 62/81
  categorize), and a uniform shuffle lands on the giveaway order by chance — 11 of 233 checks still
  fell. Each mechanic passes its ACTUAL exploit as an `unsafe` predicate and the order is re-keyed
  until the exploit fails. One 2×2 match was unfixable by any shuffle (row-i-to-row-i yields the
  same pair set either way), so `merge-checks.cjs` rejects a match under 3 pairs: a content rule,
  not a display rule.
  **Do not force the correct answer away from position 0.** Measured: it lands there 27.2% of the
  time against ~25% expected by chance. Forcing it to zero installs a sharper tell than the bias —
  "option 1 is never right" is exploitable in one sitting.
  **Practice and graded checks come from disjoint pools** (`poolFor` in `checks.ts`). They used to be
  the same items: 66 of 70 graded checkpoint checks were what the learner had just solved
  formatively with free retry and the answer printed. Also, both selectors took only the first two,
  so 294 of 368 authored checks were unreachable by anyone. **The split is a GLOBAL property and a
  private helper cannot enforce it** — it was correct and still failed, because `TodayView` called
  the raw `checksForConcept` and handed back all 70 held-out items. Any surface serving checks must
  use a practice-pool accessor, and `tests/exploit-family.test.ts` greps the call sites rather than
  trusting a remembered list.
  **In GRADED mode the players must not mark elements individually.** A per-element ok/bad vector
  against a re-enterable layout is a Mastermind board: a consistency-filter solver cleared categorize
  in 2-3 attempts and cloze in 3-7. `showDetail` on `CheckHost` answers "may they see WHICH elements
  were wrong", which is a different question from `mode`'s "is this scored" — the Daily Brief scores
  and still shows detail, because it never re-offers the same item.
  **A guard must cover the exploit FAMILY, not one member.** Rejecting only the straight diagonal left
  28 of 93 match checks (14 of the 24 3x3s) open to some rotation. All four mechanics now reject
  rotations, reversals and alternations, verified across attempts 0-3.
  **When a guard becomes UNSATISFIABLE, that is information — the defect is not in the layer you are
  guarding.** Widening the match guard to the full dihedral group forbids 100% of the permutation
  space at 3 pairs (2n = 6 patterns, 3! = 6 permutations), and the categorize authored-order
  strategies never read the display order at all — 60 of 101 keys ARE an even sweep. Those are content
  defects wearing a display costume: a 3-pair match needs a fourth row, a sweep-shaped key needs
  re-authoring. Forcing the guard falls back to a rotation, and a predictable order is a sharper tell
  than a chance one. See ADR-011.
  **A cap that lives in component state is advisory.** `MAX_ATTEMPTS` was `useState(0)`, so F5 handed
  out another independently-scoring run and `Math.max` meant it could only help the guesser — 28 of 35
  checkpoints cleared above 5% within six reloads. Enforce at the SCORING boundary (`recordCheckpoint`
  refuses past the cap), persist it in `Progress`, and restore it in `backup.ts`.
  **Unscored is not unguarded.** `/build` is formative and prints the criterion list, which states the
  target topology in words — and all six challenges are also graded checkpoint steps, so a formative
  page handed over every gate's answer. Gate on a separate `revealSpec`/`showDetail` decision, never
  on `mode` alone.
  **The dominant attack is not positional and the shuffle cannot touch it.** Options are identified by
  TEXT, so a learner remembers what they ruled out even when it moves. On attempt J they choose among
  n-(J-1) texts. Measured: 23 of 35 checkpoints exceeded a 5% zero-knowledge clear rate somewhere in
  attempts 1-6, worst 30.6%. Bounded by `MAX_ATTEMPTS = 2` plus honouring the 0.85 floor that
  `store.ts` documents — `(n-1)/n` is 0.75 at four steps, and 9 checkpoints cleared below it.
  **A failed checkpoint does not reveal the key.** It used to paint the correct option green on every
  reveal while `retry()` replayed an identical order, so two passes cleared any gate. A wrong pick
  now marks only the pick, and an attempt counter feeds the shuffle key.
- **Teaching content has a written contract, and the contract is a GATE.**
  `docs/curriculum/REWRITE-CONTRACT.md` is the five-section template every concept follows
  (definition first in plain words → a labelled `## What you buy, and what you pay` triple → the
  trigger with a cheaper option ruled out first → the non-negotiables → analogy last). Authors have
  exactly four marks in `explanation`: `**bold**`, `` `code` ``, `- bullet`, `## label`.
  **Why it is a gate and not a style note:** the contract shipped as prose in a doc and was adopted in
  **1 of 178 concepts**. 177 had zero bold, zero bullets, zero labels; 159 were exactly three
  paragraphs; 79 contained no digit at all; 171 `why` lines opened "Trains the judgment of…".
  `tools/check-prose.cjs` now enforces 19 rules over a shrinking baseline (`tools/prose-baseline.txt`),
  the same ratchet shape as `check-trace.cjs`. Do not add a baseline line to make a build pass.
  Twice during that pass the gate fired on CORRECT content and the RULE was fixed, not the content —
  "leverage" as a noun is this domain's core vocabulary (102 correct uses, 0 corporate-verb uses), and
  `numbers` is a figures list where semicolons are the right separator. A gate that fires on correct
  content trains people to bypass the gate.
- **The Codex is a REFERENCE, not a second curriculum.** `/[locale]/codex` answers "what is X, when do
  I reach for it, what does it cost me" for AI-architecture vocabulary; the 178-concept spine teaches
  the judgment. They cross-link BOTH ways (`codexEntriesForConcept` on a lesson pane,
  `relatedConcepts` → lesson on an entry) and must not duplicate each other. Every entry states a
  `cost` as a bound and a `cheaperFirst` with its winning condition — an entry that cannot is one we
  do not understand well enough to ship. The reading path is a topological order DERIVED from the
  entry DAG (`codexPath()`, longest-chain depth), never hand-ordered.
- **Uniform excellence at the LEAF does not compose into understanding at the ROOT — every cluster
  needs a `primer`.** All 107 entries passed every gate and the reference was still hard to learn
  from: a cluster oriented the reader with ONE line of tagline and then handed over up to 18 sibling
  techniques as a flat list, 49 of 107 entries were DAG roots so they all arrived as peers, and the
  umbrella term was never defined — "RAG" appeared 126 times in the data and "retrieval-augmented
  generation" appeared ZERO times in `codex.json` OR `lessons.json`. A reference organized for
  LOOKUP fails the reader who does not yet own the vocabulary they are looking up.
  `docs/curriculum/PRIMER-CONTRACT.md` is the gate: umbrella definition → the forcing problem with a
  figure an entry below states → the AXIS every member varies along → the FAMILIES as a **total
  partition** → the ordered questions that pick one. Nothing in a primer folds (an entry is
  consulted, so hiding its mechanism is right; a primer is what a lost reader needs, and a fold is
  what a lost reader does not open).
  **The axis is the field that fails.** Four of five rejected primers failed the same way: the
  families carved the cluster correctly and the axis did not describe that carve, so a reader
  trusting `axisOfChoice` as their classifier was misrouted. To review one, take the axis and try to
  place a specific entry with it — `tools-integration` named two dimensions for three families,
  leaving `mcp-primitives` unplaceable. The total-partition rule is enforced because a families list
  that quietly drops an entry re-creates the orphan defect **one level up**, invisibly.
  **Word caps are measured on the authored source language (EN), not both** — Spanish runs 20-40%
  longer, so a shared cap either lets EN sprawl or rejects correct ES. Family labels are the
  exception with a looser ES cap of their own (9 vs 6): dropping the ES cap entirely let a 13-word
  Spanish sentence through, since the only other label rule is the trailing full stop.
- **A figure can be right inside every entry and still wrong across the Codex.** `check-trace.cjs`
  traces a figure to its concept and `merge-codex.cjs` validates an entry against itself; neither
  compares two entries. `fixed-size-chunking` cited text-embedding-3's limit as 8,191 tokens while
  `embedding-vector-geometry` said 8192 in three of its own fields, and every gate was green because
  each entry was internally consistent. `tests/codex-primer.test.ts` guards named models' documented
  constants only — 8192 is still correct three times over for jina-v2's window, Bedrock's `maxTokens`
  and vLLM's `max_num_batched_tokens`, so a rule about the bare number would fire on correct content.
- **Derive counts and maps from the spine, never hardcode them.** Adding the 7th domain broke five
  places that had literal `"six domains"`, a hardcoded domain→axis map with a silent `?? 1` fallback
  (every Cloud lesson rendered as "Technical Depth"), a `DOMAIN_ORDER.indexOf` sort that put the
  unlisted domain FIRST, a hardcoded domain allowlist in a merge script, and the same list in a test.
  If you write a domain id or a count as a literal, assume it will be wrong within a month.

- **A gate that fires on correct content is a broken gate — and one that fires on nothing may be
  too.** Four rules written during the 2026-08 transformation were wrong, each found by attacking
  the rule rather than reading its output: duplication over generated labels reported 595 false
  pairs; "no diacritics past 40 words" missed a 35-word untranslated paragraph and at 25 words fired
  on 10 pieces of correct Spanish (authored Spanish runs to 52 accent-free words — no threshold on
  that signal both catches and spares, so the rule became the measured EN/ES function-word skew);
  scoring N/A as 0 manufactured 435 fake audit failures; "the objective ends in a question mark"
  scored all 178 concepts a perfect 4. Every gate here now ships a self-test containing BOTH real
  defects and real correct content, and `npm run verify` runs them.
- **Verify a test by reverting the fix it guards.** One test in this pass passed after the defect was
  fully restored: it rebuilt the shuffle key itself instead of consuming what the component uses, so
  it proved a property of its own arithmetic. A pure test cannot observe a component's arguments —
  either extract the seam (`checkpointItemKey`) or assert the wiring in source.
- **Absence is invisible to schema validators.** `merge-lessons`, `merge-codex` and `check-prose` all
  check that what exists is well-formed. They cannot see a domain with no checks, an `axes` diagram
  with no nodes, or a `source` that is simply missing — all three shipped. `check-coverage.cjs` and
  `check-refs.cjs` exist for that class, and `source` is now required rather than validated-when-present.

## Hard bars (project identity)
- **"Must not look AI-generated"**: hand-authored SVG/CSS for anything explanatory. Diffusion/raster
  is reserved for **decorative boss/hero art only** (never diagrams — they'd be wrong). Boss art is
  locally generated, project-owned (see `src/assets/README.md`); any third-party raster must be CC0.
- **WCAG AA** contrast; keyboard + tap operable (checks/widgets use tap-to-place, not drag).
- **Static and model-free. No LLM in the web app, ever** (ADR-012, enforced by
  `tools/check-static.cjs` in `content:check`). Concretely forbidden: a model SDK in
  `package.json`, an `src/app/api` directory, `"use server"`, a `runtime` export,
  `force-dynamic`, any `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`, a credential-shaped
  literal, a non-`NEXT_PUBLIC_` env var, and `Math.random()` in a rendered module. Every check
  is graded deterministically offline from bundled content.
  - **Simplicity is the feature, not a limitation.** 12 dependencies, 0 network calls after
    load, `localStorage` persistence, no key to leak, no backend to operate, works offline. A
    capability that costs this — free-text grading is the standing example — is declined, not
    deferred. `tools/selftest-static.cjs` (22 cases) proves the gate catches each violation
    while still accepting vendor NAMES in content and prose about tokens.

## Working with multi-agent fleets (operational, hard-won)
- Agents on AI-topic content get derailed by skills auto-triggering (Claude/model mentions) — in
  fleet prompts, explicitly **forbid Skill/WebFetch/WebSearch**.
- A single agent authoring many deep bilingual items trips "connection closed" / stall watchdogs —
  **split into ≤4-item batches** via direct Agent calls that **Write to a file** (survives truncation).
- Merge fleet output **deterministically with a validating script** (in-range indices, real slugs);
  never trust raw agent JSON into a shipped data file.

## Deploy
Owner runs deploys himself; prepare code + a runbook, **do not `git push`**. Work happens on
feature branches (current: `redesign-learn-hub-themes`).
