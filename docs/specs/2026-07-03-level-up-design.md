# level-up — Design Spec

**Date:** 2026-07-03
**Owner:** Gonzalo Munoz
**Status:** Approved (build authorized, autonomous fleet)

## One-liner

A bilingual (EN/ES) platform that first *diagnoses* an engineer across multiple
competency axes, then delivers a *gamified roadmap* to close the gap up to
Staff/Principal — across two tracks: **General Engineering** and the flagship
**Real World AI Engineering**. "The definitive guide: reach Principal with this alone."

## Non-negotiables

- **Must NOT look AI-generated.** Original voice, opinionated content, hand-crafted
  visual system, real engineering judgment. No generic listicles, no filler.
- **Fully bilingual** — UI *and* content (EN/ES). This is a LATAM brand asset.
- **Differentiated & cool** — signature gamification, not "another course".
- Aligned with Gonzalo's brand: educator-first "Real World AI Engineering",
  SPOCG scorecard as a flagship framework, "what actually works in production".

## Architecture

- **Next.js** static export (same pattern as `personal-platform`). Future subdomain:
  `levelup.gonzalo-munoz.com`.
- **Content as data** — MDX/JSON per module. Scales to hundreds of modules without
  touching components.
- **Progress in localStorage** (XP, portfolio, skill tree, streaks). Backend
  (Cognito + DynamoDB, reusing get-certified's pattern) is Phase 2.
- **i18n EN/ES** with persistent toggle; content translated, not just chrome.
- **Visuals:** hand-authored inline SVG for technical diagrams + `<HeroSlot>` markers
  where Gonzalo later drops generated hero images. NO raster in this build.

## Three product pillars

### A. Diagnostic assessment (the differentiator)
Dreyfus-style competency ladder crossed with 5 axes:
*Technical Depth · System Design · AI Engineering · Leadership/Influence · Craft & Delivery*.
Output is a **radar**, not a single number. Question types: conceptual,
judgment scenarios ("what would you do"), calibrated self-assessment.
Produces a **personalized roadmap** prioritizing weak axes.

### B. Modular learning roadmap
Topic by topic, module by module. Each module:
concept (with SVG) → quiz → **quest** (portfolio mini-project) →
**boss battle** (Staff+ role simulation: design review, incident, arch interview).
Content curated from research into *what recognized Staff/Principal engineers
actually know* (2026 trends).

### C. Signature gamification (4 mechanics, integrated)
- **Skill Tree / constellation** — visual map that lights up with progress.
- **Proof-of-Work quests** — accumulate a verifiable portfolio, not just points.
- **XP + levels + streaks + leagues** — daily engagement.
- **Boss battles** — the "final boss" of each level = evaluated Staff+ scenario.

## Fleet deliverables (this build)

1. **Research** (web, 2026 trends): Staff/Principal competency frameworks
   (Will Larson, Tanya Reilly, public Big-Tech ladders), real AI-Engineering
   curriculum, gamification mechanics that work.
2. **Complete engine**: assessment + radar + roadmap + 4 mechanics + EN/ES + design
   (evolving get-certified's premium dark visual system).
3. **1 level seeded deeply**: one full level with real modules, quizzes, quests,
   boss battle — shippeable sample. Rest = structure ready to fill.
4. **Evaluation**: 4-5 adversarial reviewer subagents (originality, pedagogy,
   technical accuracy, UX/design, brand coherence) + Playwright visual verification.

## Execution

Chained `/workflows` phases: Research → Design system → Content architecture →
Engine build → Seed level → Adversarial evaluation (4-5 reviewers) → Fixes → Verify
(Playwright). Autonomous end-to-end; report at the end.

## Explicit user directives (2026-07-03)

- "Se autónomo" — run end-to-end, no checkpoint gating.
- 4 reviewer subagents to agree/evaluate results.
- Use Playwright to verify visuals.
- "Evitar a toda costa que se vea AI Generated." — highest priority quality bar.
