# Definitive-platform build contract (read this first)

You are one agent in a fleet upgrading **level-up** (a Next.js 15 static-export
learning platform) to match and exceed its sibling app **get-certified**
(`C:\Projects\Personal\get-certified`, vanilla JS) in visual identity and
interactive richness — while KEEPING level-up's superior parts (152 bilingual
concepts, adaptive assessment, novel checks, red-team gauntlet).

## Ground truth
- level-up already replicates get-certified's DARK theme tokens and shares the
  identical DawnBringer-16 pixel palette. Do **not** introduce a light theme.
- The design system is `src/app/styles/*.css`, imported in cascade order by
  `globals.css`. Tokens live in `01-tokens.css` — **use the CSS variables**
  (`--bg`, `--surface`, `--text`, `--gen`, `--ai`, `--ai-signal`, `--amber`,
  `--r-md`, `--s-4`, `--dur-2`, `--eout`, DawnBringer `--db-*`). Never hardcode
  hex that a token already covers.

## HARD BARS (violating any = automatic FAIL)
1. **Bilingual**: every learner-facing / UI string is `I18nText` (`{en,es}`),
   rendered with `t(text, locale)`. ES is **authored, not machine-translated**
   (correct ¿¡ñ + tildes, no calques: "compensación" for tradeoff, "confiable"
   not "robusto"). New chrome strings: pass them in as props with inline
   `{en,es}` — do **NOT** edit `src/i18n/messages.ts` or `src/i18n/config.ts`
   (shared file, owned by the orchestrator).
2. **Determinism**: never `Math.random()` / `Date.now()` at render time (SSR/
   hydration parity). Seed instead.
3. **Motion**: transform/opacity only; double-gated on `prefers-reduced-motion`
   with a static fallback. Content is **visible by default**, armed-on-JS —
   never `opacity:0` as the default state (breaks no-JS + screenshots).
4. **No AI-slop / hand-authored explanatory visuals**: diagrams, schematics,
   code overlays, tooltips are hand-authored SVG/CSS/TSX. Diffusion/raster is
   DECORATIVE ONLY (boss/hero/concept art) and never a diagram.
5. **WCAG AA** contrast; fully keyboard operable; visible focus rings; tap
   targets ≥ 40px. Interactive checks use tap-to-place, not drag.
6. **"use client"** on any component using hooks/effects/events.
7. Must pass: `npx tsc --noEmit`, `npx next lint --dir src`, `npm run build`.
   Keep bundle lean (no new npm deps without orchestrator sign-off).

## Files you MUST NOT touch (shared; orchestrator owns them)
`src/app/globals.css`, `src/i18n/messages.ts`, `src/i18n/config.ts`,
`src/lib/types.ts`, `src/app/layout.tsx`. If you believe a type or message is
needed, state it in your final report as a REQUEST; do not edit it.

## Reference implementations in get-certified (study, then reinterpret in TSX)
- Code tooltips + rainbow braces + reveal: `get-certified/src/code-view.js`
- Figure zoom lightbox (focus-trapped, Esc/scrim close): `get-certified/src/figure-zoom.js`
- Animated staged flow diagrams: `get-certified/src/diagram-fx.js`
- Signature mode-switch pill (sun/invader, role=switch): `get-certified/src/mode-switch.js`, styles in `get-certified/styles.css`
- XP rank ladder data shape: `get-certified/content/shared/ranks.json`

## Your output
When done: report (a) exactly which files you created/modified, (b) any REQUESTS
for shared-file changes, (c) confirmation you ran tsc/lint/build clean or the
exact errors. Keep code in the house style of the surrounding files.
