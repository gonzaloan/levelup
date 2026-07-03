# level-up

**The definitive guide to the part of engineering coding practice can't teach you** —
the judgment, scope, direction, and leverage that move an engineer from Senior
toward Staff and Principal. Bilingual EN/ES. Sibling of `get-certified`.

## The thesis

Getting better at writing code stops being enough somewhere around Senior. AI
now writes the routine 70%; the promotion past Senior is decided in the 30% it
can't judge for you — failure modes, the security hole, the p99 cliff, the design
nobody wrote down. **level-up measures your 30% and trains it.**

## Three pillars

1. **Diagnostic assessment** — a client-side, adaptive (MST) instrument that
   places you across five competency axes (Technical Depth · Systems &
   Architecture Judgment · Execution & Delivery Craft · Direction & Influence ·
   Leveling Up Others & Scope). It reports one of three honest bands per axis
   (never a false-precise single level), surfaces a calibration gap only when it
   exceeds measurement error, and names the *one behavioral delta* to your next
   level. See [`/method`](src/app/[locale]/method) for how it scores.
2. **Modular roadmap** — module → recall (retrieval practice) → **The Room** (a
   situational-judgment scenario with downstream consequences) → **Field Work**
   (proof-of-work, incl. the signature *30% Gauntlet*: harden AI-generated code
   against prompt injection, the p99 cliff, and swallowed errors).
3. **The Star Chart** — an observatory star map of the curriculum: bright stars
   are earned, dim ones are ahead, the clay constellation is the flagship AI
   track.

## Two tracks

- **General Engineering** (seeded deeply: L5 "The Staff Threshold", 9 modules).
- **Real World AI Engineering** (flagship; the 30% Gauntlet is live, full
  curriculum lands next).

## Stack

- **Next.js** static export (like `personal-platform`), React 19, TypeScript.
- **Content-as-data**: `src/content/data/general-l5.json` — every learner-facing
  string is `{en, es}`. Authored, not machine-translated.
- **Progress in `localStorage`** (`src/lib/store.ts`); Cognito+DynamoDB sync is a
  future phase.
- **Hand-authored inline SVG** for the Radar and Star Chart. No raster this build.

## Design

Dark-only "Observatory / Engineering-Instrument" system in `src/app/globals.css`,
governed by [`src/design/anti-slop-checklist.md`](src/design/anti-slop-checklist.md)
and [`src/design/voice-and-copy.md`](src/design/voice-and-copy.md). The #1 rule:
it must not read as AI-generated.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000  → redirects to /en
npm run build        # static export to out/
npm test             # vitest: engine unit tests + Monte-Carlo band accuracy
npm run test:visual  # playwright: EN+ES screens, contrast, no-overflow, anti-slop
```

## How it was built

Design → research (6-track web fleet + 4 adversarial reviewers) → engine +
visualizations + app shell (hand-built for coherence) → content (13-agent fleet,
Principal-fact-checked, then a polish pass for voice + Spanish) → adversarial
product review + Playwright verification. See `docs/specs/` and `research/`.
