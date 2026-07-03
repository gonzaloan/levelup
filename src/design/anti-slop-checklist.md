# Anti-slop checklist (enforce at every design review)

The owner's hardest requirement: **the product must not read as AI-generated.**
Every screen must pass this before it ships. Playwright asserts what it can.

## Visual tells — must all be FALSE
- [ ] No purple/violet→indigo 135° full-bleed hero gradient. (Track accent gradients at 135° on *nodes / radar / threshold moments* are allowed — it's the hue+full-bleed that's banned.)
- [ ] No Inter-for-everything. A display face (Instrument Serif) and structural face (Space Grotesk) carry headings. Numerals are mono.
- [ ] No centered-hero + exactly-3-equal-rounded-cards. Landing uses the 7/5 asymmetric grid.
- [ ] No emoji bullets (✨🚀🎯🔥). Ever.
- [ ] No glassmorphism everywhere. Elevation is overlay films + hairlines.
- [ ] No uniform 16px+ radii. Controls 6px, cards 10–12px.
- [ ] No stock isometric / 3D-blob / Corporate-Memphis art. All illustration is authored SVG in the observatory/blueprint language.
- [ ] No dead-centered vertical rhythm. Intentional asymmetry on a real grid.
- [ ] No generic soft drop shadows on cards. Milled top-edge highlight + hairline border.
- [ ] No "Trusted by 10,000+" / logo salad / fake social proof.
- [ ] No gradient headline text.
- [ ] No cartoon mascots / confetti-as-substance / fake urgency / scarcity timers.

## Content tells — must all be FALSE
- [ ] No listicle filler. Every section states an opinion.
- [ ] No machine-translated ES. All learner-facing ES is authored/reviewed.
- [ ] No em-dash flooding, no "not X but Y" cadence on repeat, no citation-stuffing after every clause, no bold-everything.
- [ ] No RPG vocabulary in rendered copy: no "boss / XP / quest / grind". Use the domain language (The Room, Field Work, Signal, Star Chart, Cadence, Cohort, cross the threshold).
- [ ] No false precision. Placement shows a 3-band range, not a crisp single stage.
- [ ] No hype adjectives ("revolutionary", "game-changing", "seamless", "cutting-edge").

## Enforced in CI / Playwright
- [ ] Body text contrast ≥ 4.5:1 on the dark canvas.
- [ ] `prefers-reduced-motion` path renders final states (constellation lit, radar drawn) with no motion.
- [ ] Both EN and ES render without layout overflow at the *longest ES* strings.
- [ ] No horizontal scroll at 360px, 768px, 1280px.
