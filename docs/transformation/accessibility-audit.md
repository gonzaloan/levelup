# Accessibility audit

> Section 22. Generated from `facts.json`. WCAG 2.2 AA is the target.

## What was measured

141 TSX files, 27 stylesheets, both themes (Studio and Pixel),
both locales.

| Signal | Count |
|---|---:|
| Files using `aria-label` | 42 |
| Files using an explicit `role` | 30 |
| `<img>`/`<Image>` with `alt` | 5 of 5 |
| Files honouring reduced motion | 12 |
| Authored figures with an accessible name | 376 of 377 |

`5/5` images carry alt text. The number is small
because the platform draws its 377 figures as authored SVG through
`Schematic.tsx` rather than shipping raster images — which is also why every figure has
a caption that serves as its accessible name.

## Defects found and fixed

- **WCAG 1.4.1 (use of colour) on 3 graded surfaces.** Correctness was conveyed by colour alone. Now every state carries a text or shape cue as well.
- **WCAG 2.5.8 (target size) on 3 nav controls.** 40 px, below the 44 px minimum. Raised.
- **A trapped learner.** A Playwright failure dismissed as pre-existing turned out to be a state with no way forward — and an unreachable mobile menu was the other. `git stash` answers "did I cause it", not "is it a bug".
- **Contrast in dark mode.** White text on a light token, on the surfaces where the two themes disagree about which token is the background.

## Structural guarantees

- `tests/a11y-source.test.ts` asserts source-level properties, so a regression is a build failure rather than a discovery.
- Every check mechanic is operable by keyboard, and grading is on the resulting state, not the gesture. Architecture Builder accepts drag, tap-to-place or keyboard — it grades the graph.
- 12 files respect `prefers-reduced-motion`.
- `HtmlLang.tsx` sets `lang` per locale, so a screen reader pronounces Spanish as Spanish.
- The two themes share information and hierarchy; the visual mode never changes the pedagogy.

## Known gaps

- **No screen-reader pass.** The audit is static analysis plus keyboard testing. NVDA and VoiceOver have not been run, so the reading ORDER of a complex figure is unverified.
- **No automated axe run in CI.** Worth adding; not present.
- **Interactive widgets (14) are keyboard-operable but not individually audited** for focus order.
- **Colour-contrast ratios are not computed in CI.** The dark-mode defects above were found by looking.
