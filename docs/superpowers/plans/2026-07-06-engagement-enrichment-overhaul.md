# Engagement & Enrichment Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn every level-up lesson from a bare text column into a colorful, three-column immersive workbench with themed parallax, interactive/animated concept visuals, and real boss presentations — then enrich the flagship lessons (6×L5 + AI track) to a definitive-guide bar via a review-gated fleet.

**Architecture:** Additive content schema (old renderers unaffected) → a themed `SceneryBackground` behind lessons → a reusable `viz/` interactive-widget kit + `AnimatedSchematic` → a three-column `LessonView` (nav · content · swappable context rail) → a `BossIntro` wrapper for checkpoints/gauntlet. Foundation is hand-built inline (Tasks 1–8); flagship content enrichment + adversarial review + verification runs as the Workflow fleet (Task 9).

**Tech Stack:** Next.js (static export), React 19 client components, TypeScript, plain CSS (globals.css design tokens + `[data-theme="pixel"]`), existing `pixels.js` sprite engine, Vitest, Playwright, Workflow orchestration.

## Global Constraints

- Bilingual EN/ES: every learner-facing string is `I18nText` (`{en,es}`); both first-class.
- Two themes: Studio (default) and Pixel (`[data-theme="pixel"]`); both first-class in every component.
- All motion transform/opacity-only, double-gated on `prefers-reduced-motion: reduce`, with a static fallback; content visible-by-default / armed-on-JS (no `opacity:0` default that hides below-fold content).
- No raster except **CC0** assets (Kenney / OpenGameArt CC0), each with its license + source URL recorded under `src/assets/`.
- Schema changes are additive only — no existing content field removed or renamed.
- Branch `redesign-learn-hub-themes`; **never `git push`** (Gonzalo runs deploys).
- Deterministic rendering: no `Math.random()`/`Date.now()` at runtime (SSR/hydration parity) — seed like `Sky.tsx`.
- Verify gate for every task touching source: `npx tsc --noEmit` and `npx eslint` clean; existing 16 vitest stay green.

---

### Task 1: Additive content schema for enriched concepts

**Files:**
- Modify: `src/lib/types.ts` (extend the lesson concept interface)
- Test: `tests/schema.test.ts` (new)

**Interfaces:**
- Produces: extended `LessonConcept` optional fields: `depth?: I18nText`, `keywords?: {term:I18nText;def:I18nText}[]`, `code?: {lang:string;snippet:string;caption?:I18nText;annotations?:{line:number;note:I18nText}[]}`, `example?: {scenario:I18nText;walkthrough:I18nText}`, `architecture?: Schematic`, `visual?: {widgetId:string;params?:Record<string,unknown>}`, `pitfalls?: I18nText[]`, `analogy?: I18nText`, `source?: string`.

- [ ] **Step 1: Locate the lesson concept type.** In `src/lib/types.ts`, find the `Lesson` interface and its `concepts` element type (currently inline `{ slug; explanation; keyPoints; diagram }`). Extract it to a named `LessonConcept` interface if inline.
- [ ] **Step 2: Write failing test** `tests/schema.test.ts`: import `lessons.json`, assert every lesson has `lessonId` + `concepts[]`, and that a concept with `code` has `code.lang` a string and `code.snippet` a string (type-guard smoke). Run `npx vitest run tests/schema.test.ts` → FAIL (no enriched field yet / assertion of shape).
- [ ] **Step 3: Add the optional fields** to `LessonConcept` exactly as in Interfaces above. Add a one-line comment: `// enriched layer — all optional, additive; old renderers ignore unknown fields`.
- [ ] **Step 4:** `npx tsc --noEmit` → clean. `npx vitest run tests/schema.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(schema): additive enriched-concept fields (depth/keywords/code/example/architecture/visual/pitfalls/analogy)`.

---

### Task 2: CC0 asset intake + license ledger

**Files:**
- Create: `src/assets/README.md` (license ledger), `src/assets/bosses/` (sprites land here in Task 9 research)
- Create: `src/lib/assets.ts` (typed manifest: `bossSprite(domainId): {src,alt}`)
- Test: `tests/assets.test.ts`

**Interfaces:**
- Produces: `BOSS_BY_DOMAIN: Record<string,{file:string;name:I18nText;title:I18nText;license:string;source:string}>`, `bossFor(domainId): …`.

- [ ] **Step 1:** Create `src/assets/README.md` documenting the CC0-only rule and a table (file · source URL · license · SHA). Seed with a placeholder row noting the research phase fills real rows.
- [ ] **Step 2: Write failing test** `tests/assets.test.ts`: for each of the 6 domain ids, `bossFor(id)` returns an object with non-empty `license` containing "CC0" (or "public domain") and a non-empty `source`. Run → FAIL.
- [ ] **Step 3:** Create `src/lib/assets.ts` with `BOSS_BY_DOMAIN` for all six domains. Until real sprites arrive, `file` points at an authored SVG fallback string and `license: "CC0 (authored placeholder)"`, `source: "level-up authored"`. This keeps the build green; Task 9 research swaps in real CC0 sprites + real license rows.
- [ ] **Step 4:** `npx vitest run tests/assets.test.ts` → PASS. `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** `feat(assets): CC0 boss-sprite manifest + license ledger`.

---

### Task 3: SceneryBackground — themed parallax behind lessons

**Files:**
- Create: `src/components/SceneryBackground.tsx`
- Modify: `src/app/globals.css` (add `.scenery*` rules for both themes; add pixel overrides)
- Test: `tests/scenery.test.tsx` (render smoke, reduced-motion static)

**Interfaces:**
- Consumes: `pixels.js` `sprite()` via `PixelSprite`.
- Produces: `<SceneryBackground track="general"|"ai" />` — a fixed, `pointer-events:none`, `aria-hidden` layer.

- [ ] **Step 1: Write failing test** `tests/scenery.test.tsx`: render `<SceneryBackground track="ai" />`; assert the root has `aria-hidden="true"` and class `scenery`. Run → FAIL.
- [ ] **Step 2: Implement** `SceneryBackground.tsx`: a `position:fixed; inset:0; z-index:-1; pointer-events:none; aria-hidden` wrapper with layered children — Studio: reuse existing `.sky` gradient + faint grain; Pixel (via CSS `[data-theme="pixel"]` sibling selectors): DawnBringer sky gradient, drifting `cloud`/`sun`/`mountainsFar`/`mountainsNear` `PixelSprite`s and a tiled ground band. Track tint via `--track`/`--track-accent` on the wrapper. No inline animation state — motion lives in CSS keyframes gated on `prefers-reduced-motion`.
- [ ] **Step 3: Add CSS** in `globals.css`: `.scenery`, `.scenery-cloud`, `.scenery-mtn`, `.scenery-ground` with `@media (prefers-reduced-motion: no-preference)` drift keyframes only; `[data-theme="pixel"] .scenery*` skins. Reuse existing DawnBringer vars (`--db-*`).
- [ ] **Step 4:** `npx vitest run tests/scenery.test.tsx` → PASS. `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** `feat(scenery): themed parallax background component (pixel + studio)`.

---

### Task 4: Widget kit scaffolding — registry + base + reduced-motion + theming

**Files:**
- Create: `src/components/viz/index.ts` (registry `WIDGETS: Record<string, ComponentType<WidgetProps>>`, `getWidget(id)`)
- Create: `src/components/viz/VizFrame.tsx` (shared frame: caption, controls slot, reduced-motion hook, themed border)
- Create: `src/lib/viz.ts` (`useReducedMotion()` hook; `WidgetProps` type)
- Test: `tests/viz-registry.test.tsx`

**Interfaces:**
- Produces: `WidgetProps = { params?: Record<string,unknown>; locale: Locale; track: "general"|"ai" }`; `getWidget(id): ComponentType<WidgetProps> | null`; `useReducedMotion(): boolean`; `<VizFrame caption? controls?>children</VizFrame>`.

- [ ] **Step 1: Write failing test** `tests/viz-registry.test.tsx`: `getWidget("unknown")` returns `null`; `getWidget("big-o")` returns a component (after Task 5 registers it, this asserts registry wiring; for now assert `getWidget` is a function and unknown → null). Run → FAIL.
- [ ] **Step 2: Implement** `src/lib/viz.ts` (`useReducedMotion` mirroring the `matchMedia` pattern in `PixelOverworld`, SSR-safe default `false`), `viz/VizFrame.tsx` (themed `<figure>` with optional caption + a controls region + reduced-motion class), and `viz/index.ts` with an empty-then-populated `WIDGETS` map + `getWidget`.
- [ ] **Step 3:** `npx vitest run tests/viz-registry.test.tsx` → PASS. `npx tsc --noEmit` clean.
- [ ] **Step 4: Commit** `feat(viz): widget-kit scaffolding — registry, VizFrame, reduced-motion hook`.

---

### Task 5: Signature interactive widgets (the reusable kit)

**Files:**
- Create: `src/components/viz/BigOExplorer.tsx`, `SortRace.tsx`, `ConsistencySlider.tsx`, `RagPipeline.tsx`, `ConsensusRounds.tsx`, `LatencyBudget.tsx`, `TokenEconomics.tsx`, `ThreatModelBoard.tsx`, `ScalingCurves.tsx`, `EvalHarness.tsx`
- Modify: `src/components/viz/index.ts` (register each)
- Test: `tests/viz-widgets.test.tsx`

**Interfaces:**
- Consumes: `WidgetProps`, `VizFrame`, `useReducedMotion`.
- Produces: each widget registered under a stable `widgetId` (`big-o`, `sort-race`, `consistency`, `rag-pipeline`, `consensus`, `latency-budget`, `token-economics`, `threat-board`, `scaling-curves`, `eval-harness`).

- [ ] **Step 1: Write failing test** `tests/viz-widgets.test.tsx`: for each registered id, render `getWidget(id)` with `{locale:"en",track:"general"}`; assert it mounts without throwing and, when `matchMedia` reduce=true, renders a static frame (no `requestAnimationFrame` needed for content to appear). Run → FAIL.
- [ ] **Step 2: Implement `BigOExplorer`** — an input-size slider (n) driving animated bar-heights for O(1)/O(log n)/O(n)/O(n log n)/O(n²), with the named algorithm per curve (binary search, linear scan, mergesort, nested loop). Keyboard-operable slider, ARIA live region announcing the growth, static snapshot under reduced-motion.
- [ ] **Step 3: Implement the remaining nine** widgets to the same contract (play/step or slider, keyboard, ARIA, reduced-motion static). Keep each self-contained and themed via CSS vars. Register all ten in `index.ts`.
- [ ] **Step 4:** `npx vitest run tests/viz-widgets.test.tsx` → PASS. `npx tsc --noEmit` + `npx eslint` clean.
- [ ] **Step 5: Commit** `feat(viz): ten signature interactive concept widgets`.

---

### Task 6: AnimatedSchematic — motion upgrade for the four schematic kinds

**Files:**
- Modify: `src/components/Schematic.tsx` (add opt-in reveal/pulse/flow motion, reduced-motion gated)
- Modify: `src/app/globals.css` (schematic motion keyframes; pixel skin unaffected)
- Test: `tests/schematic-motion.test.tsx`

**Interfaces:**
- Consumes: existing `SchematicSpec` (`flow/stack/compare/axes/none`).
- Produces: `<Schematic spec locale animate?/>` — `animate` defaults on when motion allowed; static otherwise. No spec/shape change (backward-compatible).

- [ ] **Step 1: Write failing test**: render `<Schematic spec={flowSpec} locale="en" />` under reduce=true; assert nodes are present and NOT hidden (no `opacity:0` inline). Run → FAIL if a default-hidden regression exists; otherwise write it to lock the invariant.
- [ ] **Step 2: Implement** staged reveal via CSS classes + `--i` index custom property (transition-delay per node), pulse on arrows, all inside `@media (prefers-reduced-motion: no-preference)`. Content is visible by default; motion only enhances.
- [ ] **Step 3:** `npx vitest run tests/schematic-motion.test.tsx` → PASS. `tsc`/`eslint` clean.
- [ ] **Step 4: Commit** `feat(schematic): reduced-motion-gated reveal/pulse animation`.

---

### Task 7: Three-column LessonView (nav · content · context rail)

**Files:**
- Modify: `src/components/LessonView.tsx` (three-column shell + wire scenery + widget rendering)
- Create: `src/components/ConceptNav.tsx`, `src/components/ContextRail.tsx`
- Modify: `src/app/globals.css` (`.lesson-grid` responsive: 3-col ≥1200 / content+tabs 768–1199 / single <768; pixel skins)
- Modify: `src/i18n/messages.ts` (rail tab labels: keywords/code/example/architecture/pitfalls/analogy/depth — EN+ES)
- Test: `tests/lessonview.test.tsx` (existing flow intact + rail tab visibility)

**Interfaces:**
- Consumes: `SceneryBackground`, `getWidget`, `Schematic`, enriched `LessonConcept` fields (Task 1).
- Produces: `<ConceptNav concepts idx onJump />`, `<ContextRail concept locale track />` (renders only tabs whose content exists).

- [ ] **Step 1: Write failing test** `tests/lessonview.test.tsx`: render `LessonView` with a fixture lesson whose concept has `keywords` + `code`; advance to a concept pane; assert the rail shows a "Keywords" and a "Code" tab and NOT an "Example" tab (no example field). Also assert the overview→concept→check→done flow still advances. Run → FAIL.
- [ ] **Step 2: Build `ContextRail.tsx`** — feature-detect each enriched field; render a tab per present field (Takeaways always if `keyPoints`); tab panel shows keywords chips / code block w/ annotations / example scenario+walkthrough / architecture `<Schematic>`. Themed, keyboard tabs (roving), mobile = chip row.
- [ ] **Step 3: Build `ConceptNav.tsx`** — numbered concept list with read/current dots, `onJump(i)`; collapses to a horizontal progress strip <768px.
- [ ] **Step 4: Rewire `LessonView`** into `.lesson-grid`: mount `<SceneryBackground track/>`; left `ConceptNav`, center existing `ConceptPane` (now also rendering `visual` via `getWidget` when present, else inline `Schematic`, plus depth "read more" + pitfalls/analogy callouts), right `ContextRail`. Keep overview/check/done stages, `markConceptsRead`, `LessonRail`, both theme skins. Remove the hardcoded `maxWidth:780` in favor of the grid.
- [ ] **Step 5: Add CSS + messages.** Responsive `.lesson-grid`; pixel overrides (zero-radius rail/nav, hard shadows). Add EN/ES rail labels to `messages.ts`.
- [ ] **Step 6:** `npx vitest run tests/lessonview.test.tsx` → PASS. `tsc`/`eslint` clean. Existing 16 vitest still green.
- [ ] **Step 7: Commit** `feat(lesson): three-column immersive workbench + swappable context rail + scenery`.

---

### Task 8: BossIntro presentation for checkpoints & gauntlet

**Files:**
- Create: `src/components/BossIntro.tsx`
- Modify: `src/components/CheckpointPlayer.tsx` (mount BossIntro + health bar), `src/components/CodeRedTeam.tsx` (boss framing)
- Modify: `src/app/globals.css` (`.boss*` styles both themes), `src/i18n/messages.ts` (boss copy)
- Test: `tests/bossintro.test.tsx`

**Interfaces:**
- Consumes: `bossFor(domainId)` (Task 2), `Reward` (existing), `useReducedMotion`.
- Produces: `<BossIntro domainId total onEngage />` (intro card → engage); a `<BossHealth remaining total />` bar.

- [ ] **Step 1: Write failing test** `tests/bossintro.test.tsx`: render `<BossIntro domainId="systems-architecture" total={7} onEngage=fn />`; assert boss name + a "start" control; clicking calls `onEngage`. Under reduce=true no drain animation class. Run → FAIL.
- [ ] **Step 2: Implement `BossIntro`** — themed card: pixel = CC0 boss sprite + name/title + health bar; studio = restrained instrument variant (no cartoon sprite). Victory hook reuses `Reward`. Health bar = `remaining/total`.
- [ ] **Step 3: Wire into `CheckpointPlayer`** (show intro before Q1, health drains per answer) and `CodeRedTeam` (boss framing for the Gauntlet).
- [ ] **Step 4:** `npx vitest run tests/bossintro.test.tsx` → PASS. `tsc`/`eslint` clean.
- [ ] **Step 5: Commit** `feat(boss): boss-battle presentation for checkpoints + gauntlet`.

---

### Task 9: Flagship enrichment + adversarial review + verify (Workflow fleet)

**Scope:** flagship lessons = the six `*-l5` + the full AI track (`ai-engineering-l3..l7`) — 10 lessons. Runs as a resumable Workflow. Foundation (Tasks 1–8) must be merged first so enriched fields render.

**Fleet phases (see spec §"The fleet"):**
- [ ] **Phase A — Research (parallel):** (1) source & license-verify CC0 boss/hero pixel sprites (Kenney/OpenGameArt CC0) → write real rows into `src/assets/README.md` + files into `src/assets/bosses/` + update `src/lib/assets.ts`; (2) per signature widget, verify the algorithm names/steps/"aha"; (3) refresh authoritative sources per flagship domain. Structured output.
- [ ] **Phase B — Enrich (pipeline, per concept in flagship lessons):** author `depth/keywords/code/example/architecture/pitfalls/analogy` + assign `visual.widgetId` (from the kit) or an animated `diagram`/`architecture` → Principal-level cited fact-check → de-slop editor (strip AI tells, fix ES calques) → validated structured output merged into `lessons.json`. `log()` any concept skipped.
- [ ] **Phase C — Adversarial review (per lesson + global, loop until unanimous):** 3 PASS/FAIL reviewers — Design/UX, Content/Pedagogy, Technical-correctness. Apply must-fixes; re-review until all three PASS.
- [ ] **Phase D — Verify:** `npx tsc --noEmit`, `npx eslint`, `npx vitest run` (16 green), Playwright visual on lesson + checkpoint + boss across **both themes × EN/ES**, `npm run build` static export. Capture screenshots proving the in-lesson area is no longer a bare text column.
- [ ] **Commit** after review PASS + green verify: `feat(content): flagship lessons enriched to definitive-guide bar (6xL5 + AI track)`.

**Follow-up (separate run/spec):** apply Phase B–D across the remaining ~142 concepts once the flagship bar is confirmed by Gonzalo.

---

## Self-Review

- **Spec coverage:** schema (T1), CC0 assets+ledger (T2, T9-A), scenery/parallax (T3), widget kit + signature interactives (T4–T5), animated diagrams (T6), three-column layout + context rail (T7), boss presentation (T8), flagship enrichment + 3-reviewer gate + verify (T9). All spec sections mapped.
- **Placeholders:** none — each foundation task carries concrete files, test intent, and commit; T9 is intentionally an orchestrated fleet, not hand-code.
- **Type consistency:** `LessonConcept` fields (T1) are consumed verbatim by `ContextRail`/`ConceptPane` (T7); `WidgetProps`/`getWidget` (T4) used by T5 + T7; `bossFor` (T2) used by T8/T9.
