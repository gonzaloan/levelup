# level-up — Code Hygiene Cleanup

**Date:** 2026-07-07
**Branch:** `redesign-learn-hub-themes` (no push)
**Status:** Approved design → implementation

## Goal

Improve maintainability and readability without changing behavior. The codebase already works
(87 files, largest 356 lines, 0 TODO/FIXME, 33 vitest + Playwright green). This is *pragmatic clean
code*, not formal clean architecture (which would be over-engineering for a static Next.js export).

## Guiding principle

**Refactor = identical behavior.** No logic rewrites. Only reorganize where code lives and how it
reads. Every step ends with `tsc` + `lint` + `vitest` + `build` + Playwright green, in a small,
reversible commit. Verify runs `--workers=1` for Playwright (static-server contention, per prior note).

## The five focus areas (ordered by value / low risk)

### 1. Split `globals.css` (1562 lines → per-concern modules)
The biggest smell: one file holding tokens, base, layout, components, viz, checks, boss, lesson,
pixel-theme, and motion. Split into `src/app/styles/*.css`, imported (in order) from `globals.css`:
`tokens.css`, `base.css`, `layout.css`, `components.css`, `lesson.css`, `viz.css`, `checks.css`,
`boss.css`, `scenery.css`, `pixel-theme.css`, `motion.css`. Pure relocation — CSS is concatenated
in import order, so cascade is preserved. Verify: build + Playwright screenshots unchanged.

### 2. Extract repeated inline styles → classes
35 components use `style={{}}`. Keep genuinely dynamic ones (e.g. `--meter-val`, computed widths).
Move repeated static patterns (page `wrap` padding, `stack` gaps, common eyebrow/section spacing)
to utility classes in `layout.css`/`components.css`. Reduces noise; unifies the look.

### 3. Split the largest components
`CurriculumView` (356), `StarChart` (347), `LessonView` (329). Extract internal subcomponents and
helpers to focused files where it genuinely aids clarity (e.g. `LessonView`'s `Practice`/`Check`/
`ConceptPane`/`LessonRail` → their own files under `components/lesson/`). Only where it helps; do
not split for its own sake.

### 4. Tidy `lib/`
Add a clear index/barrel and group by role in comments/exports: pure domain (`scoring`, `roadmap`,
`axes`, `router`), data access (`store`, `lessons`, `checks`, `curriculum`, `assets`), and shared
(`viz`, `motion`, `types`). No dependency inversion — just import clarity.

### 5. `CLAUDE.md` conventions doc
A concise guide for future sessions: folder structure, core patterns (content-as-data, i18n
`{en,es}`, dual themes, `prefers-reduced-motion` + no-JS safety, "must not look AI-generated"),
how to run tests (`npm test`, Playwright `--workers=1`), and the boss-art provenance rule.

## Execution
Each focus = one or more atomic commits with green verify between. After all five, **3 PASS/FAIL
reviewers** (Maintainability, Consistency, Behavior-preserved) loop until unanimous PASS. All on
`redesign-learn-hub-themes`.

## Out of scope (deliberately)
- No changes to scoring/assessment logic, content schema, or content data.
- No formal architecture layers (ports/adapters/use-cases) — over-engineering for this project.
- No dependency/version bumps.

## Success criteria
- `globals.css` split into focused modules; visual output pixel-identical (Playwright unchanged).
- Repeated inline styles consolidated; largest components decomposed into focused files.
- `lib/` imports clear; `CLAUDE.md` present.
- tsc/lint/33-vitest/build/Playwright green throughout; 3 reviewers unanimously PASS.
