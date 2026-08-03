# Target learning model

> Section 6 and section 23. Every count comes from `docs/transformation/facts.json`
> (`node tools/gen-facts.cjs`); `tests/facts.test.ts` fails if this document and the
> measurement disagree.

## The claim being made

A learner should not advance by scrolling. Section 23 names six things a session must
contain — prediction, a meaningful decision, immediate feedback, build or inspection,
recall, and transfer — and the honest question is which of them the platform actually
has for each of its 178 concepts.

## The nine stages, measured

| Stage | What it demands of the learner | Concepts with it | Coverage |
|---|---|---:|---:|
| **Predict** | Commit to an answer before the teaching | 3 | 2% |
| **Read** | Take in the explanation | 178 | 100% |
| **See** | Read a figure, widget or architecture | 178 | 100% |
| **Worked example** | Follow one concrete case end to end | 178 | 100% |
| **Practice** | Answer a scored check with feedback | 178 | 100% |
| **Recall** | Retrieve from memory, unprompted | 178 | 100% |
| **Build** | Construct the thing, not pick it | 6 | 3% |
| **Explain** | Articulate it in their own words | 0 | 0% |
| **Transfer** | Apply it in a second, unlike context | 0 | 0% |

Five stages are complete. Four are not, and the gaps are the useful part of this table.

### Predict — 3 of 178

The pedagogy audit found this missing platform-wide: `grep -rn predict src/` returned
two unrelated hits. The concept pane opened by naming the judgment, then showed the
figure, then explained — so the learner was told the answer before ever committing to
one. No commitment means no generation effect and no productive failure.

`ConceptPredict` and `Predict.tsx` now exist and gate the entire remainder of the pane
until a choice is made. It is deliberately **unscored and skippable**: attaching a score
to a guess made before the teaching punishes the learner for not yet knowing, which is
the whole reason for asking.

3 concepts have one. This is a content gap, not an engine gap.

### Build — 6 of 178

`BuildChallenge` grades a constructed graph — required components present, required
edges present, known anti-pattern edges absent — with partial credit. The mechanism is
real and `/build` serves it.

6 challenges exist. Two consequences follow, and only the first is obvious:
most concepts have no constructive check, and the pool is too small for graded and
practice sets to be disjoint the way `poolFor()` splits the 368 checks.

### Explain — 0 of 178

There is no free-text surface at all, and this is the one gap that cannot be closed with
content alone.

The reason it is still open: a self-graded text box is a checkbox, and an LLM-graded one
needs a server. This platform is a static export with `localStorage`-only persistence
and no API routes (`fetchCallsToApi: 0`), so grading free text would
mean either shipping a key to the browser or abandoning the deployment model. The
honest position is that Explain is unbuilt, not that flashcards cover it.

### Transfer — 0 of 178

Also zero. Transfer means the same judgment applied in a context the learner has not
seen, and no item type is tagged for it. The 37 `leansOn` edges are the
seam it would be built on: a cross-route dependency is exactly a second, unlike context
for the concept it points at.

## What holds the model up

- **368 checks across 4 mechanics** — 80 cloze, 101 categorize, 94 order, 93 match. All four are display-shuffled per attempt, so no mechanic is passable positionally.
- **35 checkpoints, 183 items** — the graded gate at the end of each domain×level cluster, capped at two attempts and threshold `max(0.85, (n-1)/n)`.
- **105 mid-lesson items** — formative, never scored, by design.
- **178 concepts with flashcards** — the Recall stage.
- **212 within-domain prerequisite edges** gate the daily brief; **37 cross-route `leansOn` edges** are advisory and never gate, so an AI learner is not forced through the systems domain.

## Why formative and graded are separated

A learner who has seen the answer has not been assessed. Three mechanisms enforce this:

1. `poolFor(slug, want)` splits the 368 authored checks by index parity — even is practice, odd is graded — so the two pools are disjoint. Overlap went from 94.3% to 0%.
2. `showDetail` gates per-element marking, partial score AND the explanation. A graded surface reveals nothing except the total.
3. The attempt number is folded into the shuffle key and persisted in `Progress`, so a retry is a different arrangement. Before this, a failed attempt revealed the key and the retry replayed the identical order — a Mastermind oracle.

## Ordering

Predict → See → Read → Worked example → Practice → Recall, then Build where one exists,
with the checkpoint as the gate. Predict comes first because a commitment made after the
explanation is not a prediction. `ConceptPane.tsx` enforces this structurally: the
remainder of the pane is wrapped in `{!predictOpen && (…)}`, so the teaching is
unreachable until the learner commits or explicitly skips.
