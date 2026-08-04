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
| **Predict** | Commit to an answer before the teaching | 24 | 13% |
| **Read** | Take in the explanation | 178 | 100% |
| **See** | Read a figure, widget or architecture | 178 | 100% |
| **Worked example** | Follow one concrete case end to end | 178 | 100% |
| **Practice** | Answer a scored check with feedback | 178 | 100% |
| **Recall** | Retrieve from memory, unprompted | 178 | 100% |
| **Build** | Construct the thing, not pick it | 10 | 6% |
| **Explain** | Articulate it in their own words | — | out of scope (ADR-012) |
| **Transfer** | Apply it in a second, unlike context | 6 | 3% |

5 stages cover every concept and 3 are partial. One stage is deliberately out of scope — Explain needs free-text grading, which needs a server, and the static deployment is worth more than the stage (ADR-012). The partial rows are where the remaining work is.

### Predict — 24 of 178

The pedagogy audit found this missing platform-wide: `grep -rn predict src/` returned
two unrelated hits. The concept pane opened by naming the judgment, then showed the
figure, then explained — so the learner was told the answer before ever committing to
one. No commitment means no generation effect and no productive failure.

`ConceptPredict` and `Predict.tsx` now exist and gate the entire remainder of the pane
until a choice is made. It is deliberately **unscored and skippable**: attaching a score
to a guess made before the teaching punishes the learner for not yet knowing, which is
the whole reason for asking.

24 concepts have one. This is a content gap, not an engine gap.

### Build — 10 of 178

`BuildChallenge` grades a constructed graph — required components present, required
edges present, known anti-pattern edges absent — with partial credit. The mechanism is
real and `/build` serves it.

10 challenges exist. Two consequences follow, and only the first is obvious:
most concepts have no constructive check, and the pool is too small for graded and
practice sets to be disjoint the way `poolFor()` splits the 380 checks.

### Explain — out of scope, by decision (ADR-012)

Not a gap. **Ruled out deliberately**, and the constraint that rules it out is enforced by
`tools/check-static.cjs`.

Explain means articulating a concept in your own words, which needs free-text judgment, which
needs one of three things: a model call from the browser (a key in a public bundle, readable
by anyone), a model call from a server (a backend, a secret, a per-use cost, a new security
surface), or self-grading. The third is the tempting one, and it is dishonest: a learner who
has already read the correct answer cannot judge impartially whether their own words matched
it. It would be a checkbox that looks like a measurement.

The platform is a static export — 21 page routes, `localStorage` persistence,
**0 API routes and 0 network calls after load**. No
runtime cost, no key to leak, no backend to operate, and it works offline once loaded. That is
worth more than one stage of nine, so the trade was declined rather than deferred.

The learning model is therefore **8 of
9 stages, and that is the
finished shape.** `tests/facts.test.ts` fails if this ever becomes non-zero, which forces
ADR-012 to be reopened instead of letting this page quietly go stale.

What is genuinely lost: no stage catches the fluency illusion by making a learner produce
prose. What partially covers it: Predict forces a commitment *before* the teaching
(24 concepts), flashcards force unprompted retrieval
(178), and graded surfaces reveal nothing — so recognition cannot stand in
for recall.

### Transfer — 6 of 178

Transfer means the same judgment applied in a context the learner has not seen. The
`leansOn` edges are the seam it is built on: a cross-route dependency is exactly a
second, unlike context for the concept it points at, and the corpus already records
37 of them.

6 concepts now carry a transfer item — a systems concept assessed
in an AI scenario. `backpressure-flow-control` is asked about a saturating inference
endpoint, `delivery-semantics-idempotency` about an agent retrying a tool call,
`caching-strategies` about which part of an LLM request may be cached. Each lands in
the GRADED pool, so clearing the checkpoint requires the transfer rather than rewarding it.

The measurement was the hard part. Six such items shipped before the schema had a
`transferTo` field, and this document correctly reported zero — nothing distinguished
them from an ordinary check, so no gate could count them. `merge-checks.cjs` now
requires that the named domain have an authored `leansOn` relationship with the
concept, which stops the field from becoming a label meaning "this feels cross-domain".

Remaining: 172 concepts. The ceiling is the edge
count, not effort — a concept with no cross-domain relationship has no second context to
be assessed in, and inventing one would be the unfounded claim the validator now rejects.

## What holds the model up

- **380 checks across 4 mechanics** — 82 cloze, 105 categorize, 98 order, 95 match. All four are display-shuffled per attempt, so no mechanic is passable positionally.
- **35 checkpoints, 183 items** — the graded gate at the end of each domain×level cluster, capped at two attempts and threshold `max(0.85, (n-1)/n)`.
- **105 mid-lesson items** — formative, never scored, by design.
- **178 concepts with flashcards** — the Recall stage.
- **212 within-domain prerequisite edges** gate the daily brief; **37 cross-route `leansOn` edges** are advisory and never gate, so an AI learner is not forced through the systems domain.

## Why formative and graded are separated

A learner who has seen the answer has not been assessed. Three mechanisms enforce this:

1. `poolFor(slug, want)` splits the 380 authored checks by index parity — even is practice, odd is graded — so the two pools are disjoint. Overlap went from 94.3% to 0%.
2. `showDetail` gates per-element marking, partial score AND the explanation. A graded surface reveals nothing except the total.
3. The attempt number is folded into the shuffle key and persisted in `Progress`, so a retry is a different arrangement. Before this, a failed attempt revealed the key and the retry replayed the identical order — a Mastermind oracle.

## Ordering

Predict → See → Read → Worked example → Practice → Recall, then Build where one exists,
with the checkpoint as the gate. Predict comes first because a commitment made after the
explanation is not a prediction. `ConceptPane.tsx` enforces this structurally: the
remainder of the pane is wrapped in `{!predictOpen && (…)}`, so the teaching is
unreachable until the learner commits or explicitly skips.
