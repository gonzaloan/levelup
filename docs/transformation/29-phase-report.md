# Phase report

> The section 29 reporting format, for the work done on branch `transformation-v2`
> on 2026-08-02. Seven commits.

## The review round, first

Two adversarial reviewers were run against this work with instructions to assume I
had been careless. Both returned **FAIL**: three assessment blockers and six content
blockers. Every one was reproduced with a number before being fixed, and every one
was **my fix being incomplete rather than wrong**:

| What I built | What it missed |
|---|---|
| A disjoint practice/graded pool split | Correct — and `/today` used the raw accessor and served all 70 held-out items |
| A withheld answer key on the mastery gate | Correct for MCQ — and the four check mechanics still marked every element ok/bad, against a frozen layout, which is a solvable oracle |
| An `unsafe` predicate per mechanic | Rejected one exploit from a family of m+1; 28 of 93 match checks stayed open |
| A partial retraction of the RAG ceiling claim | 3 of 11 fields; seven siblings still taught it, one ContextRail tab away |
| Nodes authored as ordered scales | Against axis labels I left running the other way, on three diagrams |

And the attack that turned out to **dominate** I had not measured at all: options are
identified by TEXT, so shuffling positions does not stop elimination across retries.
23 of 35 checkpoints exceeded a 5% zero-knowledge clear rate, worst 30.6%. Bounded by
capping attempts and by honouring the 0.85 threshold `store.ts` already documented —
`(n-1)/n` is 0.75 at four steps, and 9 checkpoints cleared below the project's own bar.

Three of my tests passed after the defect they guard was fully restored — every time
because the test rebuilt the thing it was meant to observe instead of importing it.

**A second round, verifying those fixes, failed too.** Two of the fixes guarded a
place the attacker does not have to go: the attempt cap lived in React state, so a
page reload handed out another independently-scoring run (28 of 35 checkpoints cleared
above 5% within six reloads), and the Architecture Builder's criterion list was gated
on `mode` — but `/build` is formative and serves all six challenges the checkpoints
grade, so it printed every gate's answer at zero cost. Unscored is not unguarded.

The third round-2 finding closed the question rather than the loop: widening the
display guard further is **unsatisfiable**. At 3 pairs the match dihedral group forbids
100% of the permutation space, and 60 of 101 categorize keys are an even sweep in
AUTHORED order, which no shuffle touches. Those are content defects wearing a display
costume (ADR-011), and the residual is now two assertions carrying the measured
numbers rather than a ceiling of zero that quietly fails.

The lesson generalises past this codebase: **a fix verified only by its author
converges on the author's model of the defect.** Everything above was found by
someone told to assume I was careless.

## Summary

I ran phases 0–2 of the transformation prompt (recon, inventory, audit) and part
of phase 3 (target IA, ADRs). Then the audit found three blockers in the
assessment machinery, and I fixed those before continuing — because shipping an
information architecture on top of a gate that could be passed without reading
would have been building on sand.

**What the audit found is not what the prompt's hypothesis predicted.** The prompt
anticipated shallow content and cognitive overload. The content is strong: 180 of
183 checkpoint stems are situated judgment calls, 0 of 1,052 option rationales are
under 12 words, and no teaching concept scores 0 on any rubric dimension. The
defects were in the machinery around the content, and in the gates meant to catch
them.

## Evidence

Every count is reproducible. The command is named beside each.

| Finding | Number | Command |
|---|---|---|
| Learner-facing units inventoried | 470 | `node tools/inventory.cjs` |
| Checks before / after | 290 → 368 | `node tools/check-coverage.cjs --report` |
| `cloud-platform` concepts with a check | 0/26 → 26/26 | same |
| Checks passable by positional play | ~164/290 → 0/368 | `tests/check-integrity.test.ts` |
| Checks passable by ANY blind pattern in the family | 28+/368 → 0/368, attempts 0-3 | `tests/exploit-family.test.ts` |
| Graded checks reachable from `/today` | 70/70 → 0/70 | same |
| Worst checkpoint, zero-knowledge clear | 30.6% → 6.3% | same |
| Graded checks identical to practice checks | 66/70 (94.3%) → 0 | same |
| Authored checks reachable by any learner | 74/368 (20%) → 209/368 (57%) | same |
| `axes` diagrams rendering nothing | 7 → 0 | `tests/visual/axes-figures.spec.ts` |
| Dead diagram references | 16 → 0 | `node tools/check-refs.cjs` |
| Missing OG share card | 1 → 0 | same |
| Lesson overviews using the banned template | 12 reported / 17 real → 12 baselined, 5 rewritten | `node tools/check-prose.cjs` |
| Tests | 207 → 252 | `npm test` |
| Content validators in `verify` | 4 → 8, plus 2 self-tests | `npm run verify` |

### The three blockers, in order of severity

1. **Three of four check mechanics were passable without reading.** `shuffle.ts`
   was written for exactly this defect class and wired to MCQ options and one of
   the four novel players. The other three shipped with no shuffle, and their
   authored answer keys are the identity permutation in 63/73 match, 58/61 cloze,
   62/81 categorize. 60 of these are appended as GRADED steps to checkpoints.
2. **The graded checks were the practice checks.** Two `.slice(0, 2)` calls walked
   the same array, so 94.3% of graded checkpoint checks were items the learner had
   solved minutes earlier with free retry and the explanation printed.
3. **A failed attempt was a free answer key.** Every reveal painted the correct
   option green regardless of the pick, and `retry()` replayed an identical order.
   Two passes cleared any of the 35 checkpoints.

## Decisions

10 ADRs in `decision-log.md`, 7 implemented and 3 proposed. The two worth reading
for the reasoning rather than the decision:

- **ADR-006** — I asserted the correct answer must never render first, since 178 of
  178 items author it there. The test reported 194 violations, and the assertion
  was wrong: it lands there 27.2% of the time against ~25% expected by chance.
  Forcing it to zero installs a *sharper* tell than the bias.
- **ADR-009** — four rules I wrote in this pass fired on correct content or missed
  real defects. Every gate now ships a self-test containing both.

## Content moved

No learner-facing id changed, so no progress migration is required.

| Unit | From | To | Handling |
|---|---|---|---|
| 78 new checks | — | `checks.json` | Authored in 7 fleet batches, each validated by `merge-checks.cjs` before merge |
| 16 diagram refs in `ai-l5.json` | claimed a figure | removed | The ids were absent from the registry, so they rendered nothing. Those 14 legacy modules are `CONVERT_TO_PRACTICE` in the inventory, so authoring 15 new SVGs for a retiring surface was the wrong spend |
| 7 `axes` diagrams | empty | authored nodes | As ordered scales, because the renderer places nodes on a monotonic diagonal; 5 captions that named quadrants were corrected too |
| `chk-tradeoff-frameworks-org-scale-2` | 2 pairs | 3 pairs + a distractor | A 2×2 match is 50/50 and no shuffle can fix it |
| `/hero/codex.webp` | missing | `track-cloud.webp` | Two orphan hero assets existed; one suits the Codex |

## Risks

**Technical.** `climb.ts` must be rewritten for two independent routes, not
reconfigured — its 9 tests encode the single-ladder model. That is the next real
engineering cost.

**Editorial.** Shared Foundations needs a per-route application scenario for 80
concepts × 2 routes. The schema supports it; the content does not exist.

**Pedagogical.** Three of the eight target stages remain unimplemented: **Explain**
(no free-text surface in the lesson spine), **Build** (6 challenges over 178
concepts), **Transfer** (no item applies a concept in a second, unlike context).
Predict was the fifth and is scoped to one lesson.

**Process.** The ratchets can still be gamed by adding a baseline line. No line was
added in this work — five overviews were rewritten instead, and the six coverage
gaps that were baselined each carry a reason, including one flagged as "this SHOULD
have builds and does not".

## Open questions

Only three, and each genuinely blocks a decision that is the owner's:

1. **ADR-010** — Reading folds under Explore, and four browse routes consolidate.
   The only proposal that changes where a returning learner finds things.
2. **Stage names.** `A1 Foundations … A5 AI Strategy`, `S1 … S5 Principal
   Engineer`. They come from the prompt and are reasonable; they are also the most
   visible naming in the product.
3. **A dedicated graded item pool** (~2.5× the current bank in new authoring). The
   current split makes the gate *unseen*; a real pool would make it
   *non-memorizable*.

## Validation

```
npm run verify ............... green
  tsc --noEmit ............... clean
  next lint --dir src ........ clean
  merge-lessons --check ...... 35 lessons valid
  merge-codex --check ........ 11 clusters, 107 entries, 14 architectures
  merge-checks --check ....... 368 checks, no structural errors
  check-refs ................. every content reference resolves
  check-coverage ............. no new gap (6 baselined, each with a reason)
  check-trace ................ no new untraced figure
  check-prose ................ no new violation, no baseline additions
  selftest-inventory ......... 25 checks (7 defect replays, 10 correct-content fixtures)
  selftest-merge-checks ...... 16 defect classes caught, shipped content clean
  vitest ..................... 232 tests / 25 files
npm run build ................ 238 pages
playwright (--workers=1) ..... predict 5, axes 7, shuffle 3, checkpoint 2, + existing
```

**Accessibility.** WCAG 1.4.1 fixed on all three graded surfaces (correctness was
colour-only on the mastery gate). WCAG 2.5.8 fixed on three nav controls at 40px.
7 source-level invariants added; the vitest env has no jsdom, so those assert the
JSX contains the cue and Playwright asserts it renders.

**Content checks.** Both languages validated by the measured EN/ES function-word
skew rather than a diacritic count, after the diacritic rule proved to have no
working threshold.

## Next reviewable step

**Build the route shell behind a flag.** A `Route`/`Stage` entity derived from the
spine — `ROUTE_OF_DOMAIN` and `STAGE_OF` in `tools/inventory.cjs` are already the
source of truth — plus a route picker and per-route ascent replacing the breadth
quorum, with `/learn` unchanged until the flag flips. One reviewable unit, no
content change, and the prerequisite for the rest of phase 5.

## What I did not do

Stated plainly, because the prompt forbids declaring completed what is not:

- **The route model is designed, not built.** The IA document and the ADRs are
  real; no learner can pick a route today.
- **The RAG vertical slice is partial.** Its factual blocker is fixed and Predict
  is wired to it. It does not yet have its own module shell, Today episodes, a
  dedicated Build Lab, or an interview scenario.
- **Phase-2b artifacts are partial.** The visual, code and AWS audits ran as
  reviewer passes and their findings are fixed, but I did not emit
  `visual-asset-audit.md`, `diagram-inventory.json`, `code-example-inventory.json`
  or `aws-architecture-inventory.json` as standing machine-readable files.
- **`Explain`, `Build` and `Transfer` are unimplemented**, and Predict covers 3
  concepts of 178.
