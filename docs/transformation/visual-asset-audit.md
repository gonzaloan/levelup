# Visual asset audit

> Sections 12 and 36. Generated from `facts.json`.

## Inventory

377 authored figures, 14 interactive widgets,
55 static assets at 4.1 MB.

| Figure kind | Count | What it is for |
|---|---:|---|
| `flow` | 157 | A sequence or pipeline |
| `compare` | 147 | Two options side by side |
| `stack` | 38 | Layers, bottom-up |
| `axes` | 34 | A positioning judgment on two dimensions |
| `none` | 1 | Deliberate opt-out — the concept teaches through a widget |

Static assets: 38 `.webp`, 17 `.png`.
97 of 178 concepts reference an interactive widget.

## Every figure has an editable source

Section 36.5 forbids storing only a rendered PNG. All 377 figures are either
authored JSON rendered by `Schematic.tsx` or a React component — both diffable and
reviewable. There is no figure whose source is an image.

That is also what made the defects below findable.

## Defects found and fixed

- **7 empty `axes` figures.** Rendered as a labelled but empty plot: two axes, no points. A learner saw a frame with nothing in it.
- **3 more `axes` figures whose node order contradicted their own axis labels.** `check-axes.cjs` now scores node ordering against the axis poles by word overlap, so an inverted figure fails the build. One (`compute-selection-as-a-tradeoff`) was pre-existing.
- **16 dead diagram references.** Pointing at registry keys that no longer existed.
- **A missing hero image** (`/hero/codex.webp`) and a **missing OG card** (`domain-cloud-platform.png`), both referenced by shipped pages.
- **6 fabricated figures** — plausible-looking numbers with no source. Removed rather than re-sourced.

## Rules in force

- Every figure needs a purpose; a decorative figure is deleted, not captioned.
- Every figure needs an accessible name — 376 of 377 have one, and the 1 that does not is the deliberate `kind: "none"` opt-out.
- **No critical information exists only inside an image.** This is why the figures are authored data: the text is in the DOM.
- Both themes share information and hierarchy.
- Lazy loading without layout shift; assets optimised (WebP is the default format).
- A boss image is never a substitute for showing progress.

## Known gaps

- **No visual regression baseline.** 110 Playwright tests assert structure; none compare pixels. A CSS regression that preserves the DOM passes.
- **No CI size budget.** 4.1 MB across 55 assets, and nothing fails if it doubles.
- **34 axes figures are the fragile kind.** They encode a judgment in geometry, which is why they were the ones found broken. `check-axes.cjs` covers contradiction, not subtlety.
