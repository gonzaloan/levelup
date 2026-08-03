# Module work package — template

> Section 40. Copy into `docs/transformation/modules/<lessonId>.md`.

One domain × level cluster: 35 exist, averaging
5 concepts each.

## Identity

- **Lesson id:** `<domain>-<level>`
- **Route / stage:**
- **Concepts:**
- **Checkpoint:** (35 exist, 183 items total)

## Coherence

- [ ] The overview states what mastering this level *in this domain* means
- [ ] Concepts are ordered so each one's prerequisites precede it
- [ ] No concept duplicates another's judgment (`duplication-map.md`)
- [ ] The cheat sheet, if present, is reference — not a substitute for the lesson

## Assessment

- [ ] Mid-lesson quiz is formative and **not scored**
- [ ] The checkpoint covers every concept in the cluster
- [ ] Graded and practice pools are disjoint (`poolFor()` index parity)
- [ ] Threshold `max(0.85, (n-1)/n)`; two-attempt cap
- [ ] No mechanic is passable positionally across attempts 0–3
- [ ] The checkpoint reveals no per-element marking (`showDetail: false`)

## Figures

- [ ] Every figure has an editable source and an accessible name
- [ ] No `axes` figure contradicts its own labels (`check-axes.cjs`)
- [ ] No dead references (`check-refs.cjs`)

## Gate

```bash
npm run verify
npx playwright test --workers=1   # 89 tests; --workers=1 is required, the specs share localStorage
```

## Reviewer questions

1. Walk the lesson as a learner in both locales and both themes. Where does it stall?
2. Fail the checkpoint twice. Does the cap hold across a refresh?
3. Is there a concept here that would be better as a Codex entry?
