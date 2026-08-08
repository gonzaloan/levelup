# Diagram standards

> Section 36. Generated from `diagram-inventory.json` and `facts.json`.

## Inventory

473 figures in the inventory; 377 authored schematics
in the content, plus 14 interactive widgets referenced by
97 concepts.

| Kind | Count | Use it for |
|---|---:|---|
| `flow` | 157 | A sequence, pipeline or request path |
| `compare` | 147 | Two options whose tradeoff is the lesson |
| `stack` | 38 | Layers, drawn bottom-up |
| `axes` | 34 | A positioning judgment on two dimensions |
| `none` | 1 | Deliberate opt-out — a widget teaches instead |

## The rules that are enforced, not just stated

- **Every figure has an editable source.** All 473 are authored JSON rendered by `Schematic.tsx` or a React component. Section 36.5 forbids storing only a PNG, and `tests/inventories.test.ts` fails if `editable` is false for any figure.
- **Every figure has an accessible name.** 376 of 377; the 1 exception is the deliberate `kind: "none"` opt-out.
- **No `diagramType: "none"` in the inventory.** An empty figure is not an inventory entry.
- **No critical information lives only in an image.** This is the real reason the figures are data: the text is in the DOM, so it is searchable, translatable and readable by a screen reader.
- **An `axes` figure may not contradict its own labels.** `check-axes.cjs` scores node ordering against the axis poles by word overlap.

## Why `axes` is the fragile kind

34 axes figures, and they were the ones found broken: **7 were empty** —
two labelled axes and no points — and **3 more had node orders contradicting their own
axis labels**. One (`compute-selection-as-a-tradeoff`) was pre-existing.

An axes figure encodes a judgment in geometry, so a wrong position is a wrong claim
rendered confidently. A flow figure with a missing node looks broken; an axes figure with
inverted poles looks fine.

## Rejected

- **6 fabricated figures** — plausible numbers, no source. Deleted rather than re-sourced, because a figure that needs a source invented for it was not measuring anything.
- **16 dead references** to registry keys that no longer existed.
- Decoration. A figure that does not carry a judgment is removed, not captioned.

## Gap

**No visual regression baseline.** 114 Playwright tests assert structure and
reachability; none compare pixels. A CSS regression that preserves the DOM passes
everything.
