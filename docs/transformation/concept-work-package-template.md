# Concept work package — template

> Section 39. Copy into `docs/transformation/concepts/<slug>.md`.

One concept, one reviewable package. The point is that a reviewer can check the work
without reading the whole corpus.

## Identity

- **Slug:**
- **Domain / level:** (one of 7 domains, L3–L7)
- **Route:** ai-architect · staff-engineer · shared-foundations
- **Stage:** (one of 13)

## The one judgment this trains

> A concept that trains no judgment is a glossary entry and belongs in the Codex.

## Outcome, observable

The learner can ______, given ______, and would notice if ______.

## Prerequisites

- Within-domain (hard gate — the daily brief will not serve this until they are read):
- `leansOn` (advisory, cross-route, never gates):

## Stage checklist

Measured against the nine stages in `target-learning-model.md`.

- [ ] **Predict** — a commitment before the teaching. Unscored, skippable. Wrong options must be real mistakes.
- [ ] **See** — figure, widget or architecture. Not decoration; state what judgment it carries.
- [ ] **Read** — explanation, one main idea per paragraph.
- [ ] **Worked example** — one concrete case end to end.
- [ ] **Practice** — at least one check, even-indexed so `poolFor()` keeps it out of the graded pool.
- [ ] **Recall** — flashcards.
- [ ] **Build** — a constructive challenge, where one applies.
- [ ] Explain / Transfer — currently unbuildable; note if this concept would need them.

## Content requirements

- [ ] Mental model stated in one sentence
- [ ] Use / avoid, as conditions a reader could check
- [ ] Tradeoffs — what it gives up, not only what it buys
- [ ] Failure modes — how it breaks in practice
- [ ] `source` is a real, fetched document
- [ ] Every figure or limit traces to that source (`check-trace.cjs`)
- [ ] Natural English **and** natural Spanish, not a literal conversion
- [ ] Glossary applied — 128 terms, 82 banned renderings (`check-glossary.cjs`)

## Gate

```bash
npm run verify
```

## Reviewer questions

1. Can a learner reach a passing score without understanding the judgment?
2. Does any graded surface reveal the answer?
3. Is any number here unsourced?
4. Does the Spanish read as Spanish, or as translated English?
