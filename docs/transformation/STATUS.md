# Transformation status

> Section 28 dashboard. Updated 2026-08-02. Counts come from
> `node tools/inventory.cjs` and `node tools/check-coverage.cjs`; nothing here is
> estimated.

## Current phase

**Phases 0–2 complete** (recon, inventory, audit). **Phase 3 partially done**: the
target IA and the decision log are written; the route model is designed but not
built. Work jumped ahead of the phase order in one place, deliberately — the audit
found three assessment blockers, and shipping an IA on top of a gate that could be
passed without reading would have been building on sand.

## Completed, with evidence

| Work | Evidence |
|---|---|
| Repository map + baseline | `00-repository-map.md`; tsc/lint clean, 207 tests at baseline |
| Content inventory, 470 units | `01-content-inventory.md`, `content-inventory.{json,csv}`, reproducible via `tools/inventory.cjs` |
| Content audit, 9-dimension rubric | `02-content-audit.md`, `content-audit.json`; 6 dimensions mechanical, 3 deferred to review and marked `null` |
| Duplication + gap analysis | `duplication-map.md`, `gaps-and-contradictions.md` |
| Target information architecture | `target-information-architecture.md` |
| 10 ADRs | `decision-log.md` — 7 implemented, 3 proposed |
| **Check-player integrity** | 3 of 4 mechanics were passable without reading. `src/lib/checkDisplay.ts` + 15 tests + 3 browser tests |
| **`cloud-platform` check bank** | 0 → 26 of 26 concepts. 78 checks, 7 validated batches. 368 total |
| **Practice/graded pool split** | 94.3% → 0% overlap; reachable content 20% → 57% |
| **Answer key withheld on a miss** | A wrong pick marks only the pick; attempt counter reshuffles |
| **The /today bypass** | `poolFor` was disjoint and the property still failed: `TodayView` used the raw accessor and served all 70 held-out graded checks. 70/70 → 0/70 |
| **The Mastermind oracle** | Graded checks froze in one order AND marked every element ok/bad. A solver cleared all 35 checkpoints by attempt 4. Attempt threaded through `checkDisplay`; `showDetail` false in graded mode |
| **The build printed its own answer** | `gradeBuild`'s criterion labels state the topology in words and rendered on every commit, in graded mode too |
| **The exploit FAMILY, not one member** | Rejecting only the straight diagonal left 28/93 match checks open to some rotation. All four mechanics now reject the family, verified across attempts 0-3 |
| **Text-elimination, the dominant attack** | Not positional, so the shuffle cannot touch it. 23/35 checkpoints exceeded 5%, worst 30.6%. Bounded by `MAX_ATTEMPTS = 2` + the 0.85 floor |
| **The partial retraction** | The RAG ceiling fix landed on 3 of 11 fields; 7 siblings still taught it, one ContextRail tab away. Propagated |
| **3 inverted axes diagrams** | Nodes ordered against unedited axis labels. `check-axes.cjs` catches the class, and found a 4th in untouched content |
| **6 fabricated figures + 3 cross-check contradictions** | Numbers a concept's prose does not contain, and two checks teaching opposite handling of the same $6k |
| **Predict stage** | The 5th of 8 target stages, on the RAG slice. 5 browser tests |
| **7 empty `axes` diagrams** | Authored + the validator hole that let them ship |
| **16 dead diagram references** | Removed; `tools/check-refs.cjs` resolves every reference now |
| **WCAG 1.4.1 on the mastery gate** | Correctness was colour-only on the highest-stakes surface |
| **44px tap targets in the nav** | The mobile hamburger was 40px — the only way to reach the nav on a phone |
| RAG pilot factual blocker | `rag-retrieval-quality` claimed hit-rate is a hard accuracy ceiling. It is not |
| 6 Codex internal contradictions | Each confirmed against the entry's own adjacent fields |
| 4 fabricated-figure claims | Hypotheticals restated as measured facts, cited to sources that publish no such number |

## In review

TWO ROUNDS, both **FAIL**. Round 1: 3 assessment blockers and 6 content blockers.
Round 2, verifying those fixes: 3 more, because two of my fixes guarded a place the
attacker does not have to go (a cap in React state that F5 resets; a criterion list
gated on `mode` when `/build` is formative and serves every graded challenge), and one
test certified a threshold it never measured.

Every blocker across both rounds was reproduced with a number, fixed, and then
verified by REVERTING the fix and confirming the test fails. Final: 252 vitest, 97/97
Playwright.

**What the first round proved about my own work:** every blocker was my fix being
INCOMPLETE rather than wrong. The pool split was correct and failed at a third call
site. The withheld key was correct and did not reach the four check mechanics. The
per-mechanic guard was correct for one exploit out of a family of m+1. And I had not
measured the attack that turned out to dominate. Two of my tests also passed after
the defect they guard was fully restored.

## Blocked

Nothing is blocked on a decision. The items below are unstarted, not stuck.

## Decisions needed from the owner

1. **ADR-010 — Reading and the four browse routes.** The only proposal that
   changes where a returning learner finds things.
2. **Stage names.** `A1 Foundations … A5 AI Strategy` and `S1 … S5 Principal
   Engineer` come from the prompt. They are reasonable; they are also the most
   visible naming in the product.
3. **Whether to author a dedicated graded item pool** (ADR-004's stronger
   alternative, ~2.5× the current bank). The current split makes the gate unseen;
   a real pool would make it non-memorizable.

## Metrics

### Content
- 470 learner-facing units: 178 spine concepts, 107 Codex entries, 14 reference
  architectures, 35 checkpoints, 116 reading resources, 6 builds, 14 legacy modules
- **368 checks** across all 7 domains (was 290 across 6), 209 of them reachable by a
  learner (was 74)
- Audit means over the 178 teaching concepts, and no concept scores 0 on any
  dimension: A 2.22 · C 3.48 · D 3.72 · E 3.03 · F 3.15 · G 3.27 · H_en 3.84 ·
  H_es 3.92 · I 3.62

### Verification
- 252 vitest across 26 files
- 8 content validators in `npm run verify`: `merge-lessons`, `merge-codex`,
  `merge-checks`, `check-refs`, `check-coverage`, `check-axes`, `check-trace`,
  `check-prose`
- 2 gate self-tests: 25 + 16 assertions, each replaying real defects AND real
  correct content
- 238-page static export
- Playwright: predict (5), axes figures (7), check shuffle (3), checkpoint
  integrity (2), plus the existing suite

## Risks

1. **A gate that fires on correct content trains people to bypass it.** Four of my
   own rules did, in this transformation. Every new gate now ships with a self-test
   that includes correct-content fixtures. This risk is managed, not closed.
2. **`climb.ts` must be rewritten for two routes**, not reconfigured, and its 9
   tests encode the single-ladder model.
3. **Route A is thin at A1 and A5** — `ai-engineering` has 4 concepts at L3 and 3
   at L7. Foundations and Strategy are the two stages a route most needs to feel
   complete, and they are the two thinnest.
4. **Shared Foundations needs per-route application text** — 80 concepts × 2
   routes. Schema supports it; content does not exist.
5. **The prose and trace ratchets can be gamed by adding baseline lines.** No
   baseline line was added in this work; five overviews were rewritten instead.

## Next reviewable step

**Build the route shell behind a flag.** Concretely: a `Route`/`Stage` entity
derived from the spine (the `ROUTE_OF_DOMAIN` and `STAGE_OF` maps in
`tools/inventory.cjs` are already the source of truth), a route picker, and
per-route ascent replacing the breadth quorum — with `/learn` unchanged until the
flag flips. That is one reviewable unit, it changes no content, and it is the
prerequisite for everything else in Phase 5.

## Open coverage gaps, recorded rather than tolerated

From `node tools/check-coverage.cjs --report`:

- 4 domains have no Build Lab challenge: `technical-depth`, `direction-influence`,
  `leveling-scope`, `cloud-platform`
- 2 domains have no Codex cross-link: `direction-influence`, `leveling-scope`
- `cloud-platform` has 2 interactive widgets against 10–21 elsewhere
- 3 of 8 target learning stages remain unimplemented: **Explain** (no free-text
  surface in the lesson spine), **Build** (6 challenges over 178 concepts), and
  **Transfer** (no item applies a concept in a second, unlike context)
