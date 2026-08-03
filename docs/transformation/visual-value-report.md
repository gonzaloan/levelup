# Visual value report

> Section 36. Generated from `diagram-inventory.json` and `facts.json`.

## Does each figure earn its place?

377 authored figures, 14 interactive widgets,
55 static assets at 4.1 MB.

The test applied: **remove the figure and ask whether the concept still teaches.** If
the prose already carries it, the figure is decoration.

| Kind | Count | Carries a judgment the prose cannot |
|---|---:|---|
| `flow` | 157 | yes — order and direction |
| `compare` | 147 | yes — the two columns ARE the tradeoff |
| `stack` | 38 | yes — which layer sits on which |
| `axes` | 34 | yes — relative position on two dimensions |
| `none` | 1 | n/a — deliberate opt-out |

Every kind survives the test structurally. That is a property of the four kinds being
few and purposeful, not of the individual figures being good — which is why 10 broken
ones shipped.

## What the figures were worth: the defects they concealed

- **7 empty `axes` figures.** A frame with two labelled axes and nothing plotted. A learner reads that as "the answer is subtle" rather than "the figure is broken".
- **3 `axes` figures whose node order contradicted their own labels.** The most expensive class: the figure looks fine and states the opposite of the truth.
- **16 dead references.** Pointing at registry keys that no longer existed.
- **6 fabricated figures** — invented numbers. Deleted, not re-sourced.
- **1 missing hero image and 1 missing OG card**, both referenced by shipped pages.

34 defects in 377 figures, all found by generating the inventory and attacking
it. None was visible from reading the content.

## Value the widgets add

14 widgets referenced by 97 of
178 concepts (54%). A
widget earns its place where the judgment is about a **curve** rather than a shape — a
latency budget, a consistency slider, a scaling curve. Those cannot be drawn as a static
figure without picking one point on the curve and hiding the rest.

## Cost

4.1 MB across 55 assets
(38 .webp, 17 .png). No CI
budget enforces it. Because the 377 instructional figures are authored data
rather than images, the asset weight is almost entirely hero art and OG cards — the
teaching surface costs nearly nothing to ship.

## Verdict

The figure system is the strongest part of the content model: editable, diffable,
translatable, screen-readable, and cheap. Its weakness is that a *wrong* figure is
invisible, which is why `check-axes.cjs` and `check-refs.cjs` exist and why the
absence of a visual regression baseline is the top residual risk in `rollout-plan.md`.
