# level-up — Engagement & Enrichment Overhaul

**Date:** 2026-07-06
**Branch:** `redesign-learn-hub-themes` (no push — deploy is Gonzalo's, per personal-brand-deploy-safety)
**Status:** Approved design → implementation

## Goal

Make level-up "the definitive guide to Staff/Principal." Today the **pixel overworld** (parallax
sky, drifting clouds, winding Mario trail, castle bosses) is gorgeous, but the moment a learner
enters a **lesson** the experience collapses to a single ~780px text column — identical in both
themes, with only four thin schematic types (`flow/stack/compare/axes`) and a plain bullet list.
No background, no parallax, no code, no examples, no interactive visuals, no boss presentation.
That drop-off is the thing to fix.

Two axes of work, per Gonzalo's brief:
1. **Form** — colorful themed backgrounds/parallax in-lesson (both themes); a richer layout that
   puts key takeaways, keywords, code, examples, and architecture where they add value; boss
   battles that actually feel like boss battles.
2. **Content** — every concept enriched so it's not a wall of text: named algorithms, real code,
   worked examples, architecture, and interactive/animated visuals that make the idea click
   (e.g. O(n) → show the algorithm, race the curves). Language stays clear, concise, engaging,
   bilingual EN/ES.

## Decisions (locked with Gonzalo)

- **Assets:** Hybrid — authored CSS/SVG scenery (reusing the existing `pixels.js` sprite engine)
  + a **small curated set of CC0 pixel sprites** (Kenney / OpenGameArt CC0 ONLY, license recorded)
  reserved for **boss battles and hero moments**. Preserves the "must not look AI-generated /
  no arbitrary raster" bar; every third-party asset is CC0 with its license file committed.
- **Depth (this run):** Build the **complete engine** (schema + scenery + widget kit + 3-column
  layout + boss presentation) once, then **hand-craft a flagship-deep subset** — the six L5
  lessons + the full AI-engineering track — to set the quality bar. The **152-wide enrichment**
  is an immediate follow-up fleet (its own spec/run), so Gonzalo sees the bar before the full spend.
- **Lesson layout:** **Three-column immersive** — left concept navigator, center content, right
  swappable context rail (Takeaways · Keywords · Code · Example · Architecture). Responsive:
  2-column on laptop (rail → tabs beneath content), single column + chip tabs on mobile.
- **Concept visuals:** **Interactive widgets for signature concepts** (Big-O, sorting,
  consistency models, RAG pipeline, consensus, latency/backpressure, token economics, threat
  modeling…) from a **reusable widget kit**; **animated authored diagrams** everywhere else.
  All motion transform/opacity-only, double-gated on `prefers-reduced-motion` with static fallback.

## Architecture — five layers

### A. Content schema extension (`src/lib/types.ts`, `src/content/data/lessons.json`)
Additive and backward-compatible. Existing concepts (`slug, explanation, keyPoints, diagram`)
keep rendering unchanged. Enriched concepts gain optional fields:

```ts
interface LessonConcept {
  slug: string;
  explanation: I18nText;              // existing
  keyPoints: I18nText[];              // existing
  diagram?: Schematic;                // existing (flow/stack/compare/axes/none)
  // NEW — all optional, additive:
  depth?: I18nText;                   // extended prose (2nd read layer)
  keywords?: { term: I18nText; def: I18nText }[];
  code?: { lang: string; snippet: string; caption?: I18nText;
           annotations?: { line: number; note: I18nText }[] };
  example?: { scenario: I18nText; walkthrough: I18nText };
  architecture?: Schematic;           // richer/animated schematic
  visual?: { widgetId: string; params?: Record<string, unknown> };  // interactive widget
  pitfalls?: I18nText[];
  analogy?: I18nText;
  source?: string;                    // checkable citation for enriched claims
}
```
A migration note documents that unknown fields are ignored by old renderers; new renderer
feature-detects each field and only shows a rail tab when its content exists.

### B. Scenery layer (`src/components/SceneryBackground.tsx` + globals.css)
Themed parallax mounted behind lesson/checkpoint content, `position: fixed`, `z-index` below
content, `pointer-events: none`.
- **Pixel:** DawnBringer sky gradient + drifting `cloud`/`sun`/`mountainsFar`/`mountainsNear`
  sprites + a tiled ground band — same vocabulary as `PixelOverworld`, so lesson and overworld
  feel like one world. Track-tinted (general steel/azure vs AI clay/cyan).
- **Studio:** subtle observatory gradient + existing film-grain + faint constellation drift.
All layers transform/opacity-only; the whole component renders a static frame under
`prefers-reduced-motion: reduce` and for no-JS (visible-by-default, armed-on-JS).

### C. Interactive widget kit (`src/components/viz/`)
~10–12 reusable, themeable, accessible widgets, each with: play / step / slider controls,
keyboard operation, ARIA labels, and a static reduced-motion fallback. Themed via CSS vars so
they read correctly in both Pixel and Studio. Initial set (covers the signature concepts across
the six domains):
`BigOExplorer`, `SortRace`, `ConsistencySlider` (PACELC/CAP), `RagPipeline`, `ConsensusRounds`
(Raft/Paxos rounds), `LatencyBudget` (tail latency / backpressure), `TokenEconomics`,
`ThreatModelBoard` (STRIDE/OWASP-LLM), `CacheHierarchy`, `ScalingCurves`, `EvalHarness`.
Registry maps `widgetId → component`; concepts reference by id + params. Plus `AnimatedSchematic`
that upgrades the existing four schematic kinds with reveal/pulse/flow motion.

### D. Three-column LessonView (`src/components/LessonView.tsx` + `ContextRail.tsx` + `ConceptNav.tsx`)
- **Left — Concept navigator:** numbered concepts, read/current/locked dots, jump-to.
- **Center — Content:** eyebrow/title, prose, inline diagram or interactive widget, "read more"
  depth layer, pitfalls/analogy callouts.
- **Right — Context rail (swappable tabs):** Takeaways · Keywords · Code · Example · Architecture
  — only tabs with content appear. Sticky on desktop.
- **Responsive:** ≥1200px three columns; 768–1199px content + rail-as-tabs below; <768px single
  column, nav as a top progress strip, rail as chip tabs.
- Preserve existing flow: overview → concept panes → mid-lesson check → final test → next lesson,
  and `markConceptsRead`, the progress rail, and both theme skins.

### E. Boss presentation (`src/components/BossIntro.tsx`, wraps CheckpointPlayer / CodeRedTeam)
Game-style boss card before a checkpoint/gauntlet: CC0 pixel **boss sprite**, boss name + title
(themed per domain — e.g. "The Consistency Hydra"), an intro line, and a **health bar = questions
remaining** that drains as the learner answers. Victory reuses `Reward.tsx` star-ignition.
Reduced-motion: card appears statically, no drain animation. Pixel skin = full sprite;
Studio skin = restrained instrument-panel variant (no cartoon sprite, keeps the observatory tone).

## The fleet (Workflow orchestration — this run)

Review-gated and **resumable** (long run must waste nothing). Phases:

1. **Research** (parallel agents): (a) source & license-verify CC0 boss/hero sprites; (b) research
   signature-concept visualizations — real algorithm names, steps, and the "aha" for each widget;
   (c) refresh latest authoritative sources for the flagship lessons. Structured output.
2. **Foundation** (built inline by main session, then verified): schema extension, `SceneryBackground`,
   widget kit scaffolding + the signature widgets, three-column `LessonView`, `BossIntro`. This is
   hand-crafted core, not fleet-authored, so quality is controlled and the flagship content has rails.
3. **Flagship enrichment** (pipeline, per concept in the 6×L5 + AI track): author
   `depth/keywords/code/example/architecture/pitfalls/analogy` + assign a widget or animated diagram
   → **Principal-level fact-check** (cited) → **de-slop editor** (strip AI tells, fix ES calques) →
   validated structured output merged into `lessons.json`.
4. **Adversarial review** (per flagship lesson + global): **3 PASS/FAIL reviewers** — Design/UX,
   Content/Pedagogy, Technical-correctness. Loop: apply must-fixes, re-review, **until all three PASS**.
5. **Verify:** `tsc`, `eslint`, `vitest` (16 existing must stay green), Playwright visual across
   **both themes × EN/ES** on lesson + checkpoint + boss, and `next build` static export.
   Screenshots must show the in-lesson content area is no longer a bare text column.

**Follow-up run (separate spec):** apply the same enrichment pipeline across the remaining 152
concepts once the flagship bar is confirmed.

## Guardrails
- Additive schema only — no existing content lost; old renderers ignore new fields.
- CC0 assets only; each asset's license recorded under `src/assets/` (or `public/`) with source URL.
- Work stays on `redesign-learn-hub-themes`; **no `git push`** (Gonzalo runs deploys — personal-brand-deploy-safety).
- Fleet is resumable via `resumeFromRunId`; any coverage cap is `log()`-ed, never silent.
- Both themes and both locales are first-class in every new component; `prefers-reduced-motion`
  and no-JS fallbacks on all motion (the "opacity:0-default hides below-fold" lesson from Cycle 2).

## Success criteria
- Entering a lesson in **pixel mode** shows a colorful parallax background and a three-column
  workbench — not a bare text column.
- Signature concepts have working interactive widgets; the rest have animated diagrams.
- Every flagship concept has takeaways + at least two of {keywords, code, example, architecture}.
- Checkpoints/gauntlet open with a boss presentation.
- 3 reviewers unanimously PASS; tsc/lint/vitest/build all green; visual proof captured.
