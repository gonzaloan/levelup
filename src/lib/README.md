# `src/lib` — module map

Plain, framework-light modules. Grouped by role below (files are kept flat so the
`@/lib/x` import paths stay stable; this doc is the map). Rule of thumb: **domain**
modules are pure (no React, no I/O, unit-tested); **data** modules load content or
touch `localStorage`; **shared** are cross-cutting utilities.

## Domain (pure logic — deterministic, unit-tested)
- `axes.ts` — the six assessment axes, levels (L3–L7), bands. The vocabulary.
- `scoring.ts` — MAP-penalized 1PL theta, CBM scoring, bands + SEM. No side effects.
- `router.ts` — MST item routing for the diagnostic.
- `roadmap.ts` — deterministic roadmap generation from a result.
- `assess.ts` — assessment run assembly.

## Data (content-as-data loaders + persistence)
- `curriculum.ts` — the L3→L7 concept spine (loads `curriculum.json`).
- `lessons.ts` — teachable lessons over the spine (loads `lessons.json`).
- `checks.ts` — novel knowledge-check items + pure `gradeCheck` (loads `checks.json`).
- `assets.ts` — boss-art manifest + license provenance.
- `store.ts` — learner progress in `localStorage` (the ONLY stateful module).

## Shared (cross-cutting)
- `types.ts` — the content-as-data contract (every learner-facing string is `I18nText`).
- `viz.ts` — widget-kit types + `useReducedMotion`.
- `motion.ts` — scroll-reveal / motion primitives (reduced-motion aware).
- `pixels.js` / `pixels.d.ts` — the ported pixel-art sprite engine (JS + its type surface).

## Conventions
- Content is bilingual `{en,es}` (`I18nText`); pick text via `t(text, locale)` from `@/i18n/config`.
- Never `Math.random()` / `Date.now()` at runtime — seed deterministically (SSR/hydration parity).
- Pure domain modules must stay React-free so they remain unit-testable in the node vitest env.
