# level-up — project conventions

The definitive, bilingual, gamified guide to reach Staff/Principal engineer. Next.js static
export, content-as-data, dark-only with two themes. This file orients any future session; read it
before making changes.

## Run & verify
- `npm run dev` — local dev.
- `npm test` — vitest (node env, pure-logic tests only; no jsdom → no React-render tests).
- `npm run build` — static export to `out/` (this is the real integration check).
- `npx playwright test --workers=1` — visual/e2e. **Always `--workers=1` (or 2)**: the static
  `serve` can't handle 8 parallel workers and gives spurious timeouts.
- `npx tsc --noEmit` and `npx next lint --dir src` — must stay clean.

## Structure
- `src/app/` — routes (`/[locale]/…`), `layout.tsx`, `globals.css` (only `@import`s of `styles/*`).
- `src/app/styles/*.css` — the design system, one concern per module; **import order = cascade order**.
- `src/components/` — UI. Sub-areas: `lesson/`, `checks/`, `viz/` (interactive concept widgets).
- `src/lib/` — logic (see `src/lib/README.md` for the domain/data/shared map).
- `src/content/data/*.json` — the content-as-data (curriculum, lessons, checks). Large; edit via
  scripts/merges, not by hand.
- `src/i18n/` — locales + the UI message catalog (`messages.ts`).
- `docs/specs/`, `docs/superpowers/plans/` — design specs and implementation plans.
- `research/` — throwaway working area (fleet inputs, SD experiment). Largely gitignored.

## Core patterns (follow these)
- **Bilingual**: every learner-facing string is `I18nText` (`{en,es}`); render with `t(text, locale)`.
  UI chrome uses `m(key, locale)` from `messages.ts`. Spanish is **authored, never machine-translated**
  (correct `¿¡ñ` + tildes, no calques — "compensación" for tradeoff, "confiable" not "robusto").
- **Two themes**: Studio (default, observatory/instrument) and Pixel (`[data-theme="pixel"]`,
  Mario-3 overworld + DawnBringer palette, zero-radius hard-shadow frames). Both are first-class in
  every component; test both.
- **Motion**: transform/opacity only, double-gated on `prefers-reduced-motion`, with a static
  fallback. Content is **visible by default** / armed-on-JS — never `opacity:0` as the default
  (it hides below-fold content in no-JS + screenshots; learned the hard way).
- **Determinism**: never `Math.random()` / `Date.now()` at runtime — seed (SSR/hydration parity).
- **Content-as-data**: teaching content lives in JSON conforming to `src/lib/types.ts`; the schema
  is additive (old renderers ignore unknown fields). Pure-domain `lib` modules stay React-free.
- **Assessment integrity**: `scoring.ts` is the honest engine — don't casually change it. Graded
  checks resolve to a boolean and feed the same gate as MCQs; formative checks never score.

## Hard bars (project identity)
- **"Must not look AI-generated"**: hand-authored SVG/CSS for anything explanatory. Diffusion/raster
  is reserved for **decorative boss/hero art only** (never diagrams — they'd be wrong). Boss art is
  locally generated, project-owned (see `src/assets/README.md`); any third-party raster must be CC0.
- **WCAG AA** contrast; keyboard + tap operable (checks/widgets use tap-to-place, not drag).

## Working with multi-agent fleets (operational, hard-won)
- Agents on AI-topic content get derailed by skills auto-triggering (Claude/model mentions) — in
  fleet prompts, explicitly **forbid Skill/WebFetch/WebSearch**.
- A single agent authoring many deep bilingual items trips "connection closed" / stall watchdogs —
  **split into ≤4-item batches** via direct Agent calls that **Write to a file** (survives truncation).
- Merge fleet output **deterministically with a validating script** (in-range indices, real slugs);
  never trust raw agent JSON into a shipped data file.

## Deploy
Owner runs deploys himself; prepare code + a runbook, **do not `git push`**. Work happens on
feature branches (current: `redesign-learn-hub-themes`).
