# 00 — Repository map

> Phase 0 deliverable. Every count below was produced by running a command in
> this repository, and the command is named next to the number. Nothing here is
> estimated.

## Architecture

| Aspect | Reality |
|---|---|
| Framework | Next.js 15.3 (App Router), React 19, **static export** to `out/` |
| Language | TypeScript 5.8, strict; `tsc --noEmit` is clean |
| Package manager | npm (`package-lock.json`) |
| Rendering | Fully static. `output: "export"` plus `trailingSlash`. No server, no API routes. |
| State | `localStorage` only, single key `levelup.v1`, via `src/lib/store.ts`. No auth, no backend. |
| i18n | Hand-rolled. Route segment `/[locale]/…` for `en` or `es`; every learner-facing string is `I18nText = {en, es}`. |
| Theming | Two first-class themes: **Studio** (default) and **Pixel** (`[data-theme="pixel"]`). Dark-only. |
| Deployment | S3 + CloudFront `EKDH4IJNSZLJQ`, live at `levelup.skillrealm.dev`, idempotent `deploy/deploy.sh` |

### Why this matters for the transformation

Static export is the binding constraint on the target model. Section 16 asks for
evidence events and mastery inference; section 21 asks for analytics. Neither can
be server-side without adding a backend, which section 30 forbids introducing
casually. The design therefore keeps every scheduling and mastery decision in
**pure client modules that receive `today` as an argument** — the pattern
`src/lib/daily.ts` and `review.ts` already use — so the model can evolve to a
server later without a rewrite.

## Commands (verified this session)

| Command | Result at baseline |
|---|---|
| `npx tsc --noEmit` | clean, exit 0 |
| `npx next lint --dir src` | No ESLint warnings or errors |
| `npm test` (vitest) | **23 files, 207 tests, all pass**, ~2.0s |
| `npm run content:check` | 4 validators green (see below) |
| `npm run build` | static export (236 pages at last release) |
| `npx playwright test --workers=1` | 43 specs green at last release. **`--workers=1` is mandatory** — the static `serve` gives spurious timeouts at 8 workers. |

`content:check` runs `merge-lessons.cjs --check` (35 lessons valid), then
`merge-codex.cjs --check` (11 clusters, 107 entries, 14 architectures), then
`check-trace.cjs` (110 code artifacts, 243 salient numbers, 68% traced to their
own prose, 30 baselined exceptions), then `check-prose.cjs` (19 rules, 151
baselined, 169 known findings).

**Two ratchets already exist** and the transformation must not loosen them:
`tools/trace-baseline.txt` and `tools/prose-baseline.txt`. Adding a line to
either to make a build pass is explicitly forbidden by `CLAUDE.md`.

## Tree of the areas that matter

```
src/
├── app/
│   ├── [locale]/            21 route folders (see route map)
│   ├── styles/*.css         22 modules; @import order IS the cascade order
│   └── layout.tsx           theme boot script, metadataBase, HtmlLang
├── components/              49 top-level + checks/ (5) + lesson/ (4) + viz/ (15)
├── lib/                     27 modules — see src/lib/README.md
├── content/data/*.json      the content-as-data (6.0 MB total)
└── i18n/                    locales + messages.ts (UI chrome catalog)
tools/                       33 scripts: validating merges, gates, live verifiers
tests/                       22 vitest files + 15 Playwright specs
docs/                        DEFINITIVE-BUILD-CONTRACT, curriculum contracts, specs
public/                      53 files, 3.9 MB (badges, bosses, hero, og, worlds, brand)
```

## Content sources — the real inventory

Produced by `node tools/inventory.cjs`. **470 learner-facing units:**

| File | Size | Holds | Count |
|---|---|---|---|
| `curriculum.json` | 830 KB | the spine: 7 domains x L3–L7, prereq DAG, + checkpoints | **178 concepts, 35 checkpoints** |
| `lessons.json` | 3.36 MB | the teachable layer over the spine | **35 lessons** covering all 178 concepts |
| `checks.json` | 418 KB | novel check mechanics | **290 checks** (81 categorize, 75 order, 73 match, 61 cloze) |
| `codex.json` | 748 KB | the reference layer | **107 entries** in 11 clusters + **14 architectures** |
| `resources.json` | 99 KB | the reading list | **116 resources**, 118/118 links verified |
| `builds.json` | 22 KB | Architecture Builder challenges | **6 builds** |
| `ai-l5.json` | 332 KB | legacy diagnostic (pre-spine) | 5 modules, 26 CBM items |
| `general-l5.json` | 333 KB | legacy diagnostic (pre-spine) | 9 modules, 36 CBM items |
| `gauntlet.ts` | 14 KB | the code red-team boss | line-keyed rubric |

### Enrichment coverage across the 178 concepts

| Layer | Concepts having it |
|---|---|
| `example`, `pitfalls`, `flashcards`, `keywords`, `children` | **178 / 178** |
| `diagram` (a `Schematic` with a real kind) | 177 |
| `mnemonic` | 115 |
| `code` | 110 |
| `depth` | 103 |
| `visual` (an interactive widget) | 97 |
| `architecture` (second, system-level schematic) | 84 |
| `analogy` | 55 |

Code examples span **15 languages**; Python (45), Markdown (15) and SQL (14)
dominate. **12 of 14 registered widgets** are mapped to at least one concept.

## Data flow

```
curriculum.json ──► lib/curriculum.ts ──► ClimbView / LearnHub / lesson routes
       │                                        │
       │            lessons.json ──► lib/lessons.ts ──► LessonView (3-column)
       │            checks.json  ──► lib/checks.ts  ──► CheckHost (4 players)
       │            builds.json  ──► lib/build.ts   ──► ArchitectBuilder
       │            codex.json   ──► lib/codex.ts   ──► CodexView (+ codexPath DAG)
       │
       └──► lib/climb.ts (pure) ──► ascent gate: clear 4 of 7 domain checkpoints
                    │
localStorage levelup.v1 ◄── lib/store.ts ◄── every player component
                    │
                    └──► lib/daily.ts + review.ts (PURE, receive today) ──► TodayView
```

The one stateful module is `store.ts`. Everything scheduling-related is pure and
takes the clock as a parameter, which is why the SSG build can never drift.

## Route map (21 route files, x2 locales)

| Route | Purpose | In target IA |
|---|---|---|
| `/[locale]` | landing | rewritten (5.1) |
| `/[locale]/today` | the Daily Brief — current front door | kept, becomes 6.1 |
| `/[locale]/learn` | the Climb (level-first) + browse-by-domain | splits by route (5.2) |
| `/[locale]/lesson/[lessonId]` | 3-column lesson, 35 lessons | becomes Learn sessions |
| `/[locale]/checkpoint/[checkpointId]` | graded gate, 35 checkpoints | becomes capability checkpoints |
| `/[locale]/codex` | the reference, 107 entries | kept as canonical (6.3) |
| `/[locale]/build` | Build Lab, 6 challenges | kept, expanded (6.4) |
| `/[locale]/practice` | practice surface | restructured into Remember/Diagnose/Decide/Design/Defend |
| `/[locale]/resources` | reading list, 116 sources | gains the 6.7 fields |
| `/[locale]/me` | progress + badge shelf | becomes 6.6 multi-dimensional |
| `/[locale]/assess`, `/assess/results` | diagnostic + radar | kept (feeds route choice) |
| `/[locale]/gauntlet` | code red-team boss | kept as a lab type |
| `/[locale]/module/[moduleId]` | 14 legacy modules | **overlaps the spine** — see migration map |
| `/[locale]/map`, `/ladder`, `/tracks`, `/path`, `/method` | overworld, rank ladder, track picker, redirect, method | consolidated under Explore |
| `/[locale]/achievement/[id]` | static OG share pages | kept |

## Progress model (as it exists)

`Progress` in `src/lib/store.ts` has **17 fields**. The honest parts:

- `conceptsRead` — exposure. Opening a concept counts. Deliberately separate from
  mastery.
- `codexRead` — separate again, and documented as *not* awarding Signal, because
  attaching a reward to consumption reliably produces learners who consume.
- `checkpointsCleared` / `checkpointScores` — the real gate, at or above 0.85.
- `moduleScores` — CBM-normalized 0..1, mastery at or above 0.8.
- `reviews` — per-concept spaced-review state (`ReviewState`).
- `streak` — day keys; **one missed day forgiven, two ends it**.

**What section 6.6 asks for and this does not yet have:** the six-state ladder
(Not encountered, Introduced, Practiced, Demonstrated, Retained, Transferred),
`capability_mastery` separate from `route_progress`, `transfer_performance`, and
an `EvidenceRecord` log. `responseLog` is the seam — it already logs every
response for future IRT calibration.

## Risks

1. **The prose and trace ratchets can be gamed by adding baseline lines.** The
   transformation touches a lot of content; every content edit must keep
   `check-prose.cjs` and `check-trace.cjs` at or below their current baselines.
2. **Static export means no server-side evidence store.** Mastery inference has
   to stay client-pure or the build breaks.
3. **`lessons.json` is 3.36 MB.** It is edited only through validating merge
   scripts, never by hand — a rule with scar tissue behind it (a repair agent's
   changelog note was once written into a lesson `overview`, destroying it).
4. **Two content models coexist.** The 178-concept spine and the 14 legacy
   `ai-l5` / `general-l5` modules teach overlapping ground through different
   schemas. Section 7 says duplicates get archived *with a record*, never silently.
5. **Option-order shuffling is load-bearing.** Authored JSON puts the key first in
   ~97% of items. Any new scored surface that forgets `src/lib/shuffle.ts`
   reintroduces a gate that can be passed without reading.
   `tests/gate-integrity.test.ts` locks the existing banks; new banks must be
   added to it.
6. **Adding a 7th domain broke five hardcoded places** last time. Route and stage
   introduction is the same class of change — derive, never hardcode.

## Unknowns going in

| Unknown | How it gets resolved |
|---|---|
| Do deployed routes match local? | `tools/verify-all-live.mjs` exists and runs against the live CloudFront. |
| Which concepts belong to which of the two routes? | Measured in Phase 1 via the domain-to-route map, then reviewed. Not guessed. |
| Is the RAG pilot buildable from existing content? | **Yes, verified:** 2 spine concepts (`rag-retrieval-quality` L4, `rag-as-system` L5) + 36 Codex entries across chunking (12), embeddings (8), vector-indexes (4), retrieval-ranking (12), plus a `rag-pipeline` widget and a RAG build challenge. |
| How much content is genuinely duplicated? | 1 confirmed pair after the detector was fixed and self-tested (below). |

## Baseline, restated for the record

```
tsc --noEmit ................ clean
next lint --dir src ......... clean
vitest ...................... 23 files / 207 tests pass
merge-lessons --check ....... 35 lessons valid
merge-codex --check ......... 11 clusters, 107 entries, 14 architectures valid
check-trace ................. no new untraced figure (30 baselined)
check-prose ................. no new violation (151 baselined, 169 known findings)
```

## A Phase-0 finding worth recording

The first version of `tools/inventory.cjs` reported **595 duplicate unit pairs**
and **0 Spanish-quality flags**. Both numbers were wrong, in opposite directions,
and finding that out required attacking the detectors rather than reading their
output.

**The duplication detector was measuring itself.** It compared `title` plus
`summary`. For checkpoints those two fields are strings the inventory script
generates ("technical-depth L4 checkpoint", "8 graded judgment items over 6
concepts"), so 100% of the 595 pairs were checkpoints matching each other on my
own template. Fixed to compare authored prose only, with a 12-token floor.
Result: **1 pair**, and that pair is real — `codex:just-in-time-context-retrieval`
and `codex:progressive-tool-disclosure` document the same `defer_loading`
mechanism, down to the same 200-character regex cap.

**The Spanish detector had no working threshold.** It used "no diacritics past 40
words". A self-test (`tools/selftest-inventory.cjs`) replaying seven real defect
classes from this project's history showed it **missed a 35-word untranslated
English paragraph**. Tightening it to 25 words then **fired on 10 pieces of
correct Spanish** — authored Spanish legitimately runs up to 52 words with no
accented character. There is no threshold on that signal that both catches and
spares.

What separates the two languages is the *difference* between English and Spanish
function-word density. Measured over the 820 authored Spanish and 820 authored
English fields that ship today: Spanish tops out at -0.061, English bottoms out
at +0.107 — a 0.168 gap with **no overlap**. The threshold now sits in the middle
of that gap, and the ten pieces of correct Spanish it used to flag are checked-in
regression fixtures.

`node tools/selftest-inventory.cjs` asserts all of the above: **25 checks — 7
defect replays, 10 correct-content fixtures, 4 detector properties, 5 live-data
invariants.** It runs as part of the transformation validation suite, because a
detector reporting zero and a broken detector produce the same output.
