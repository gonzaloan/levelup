# level-up — BUILD BRIEF v2: DECISIONS & AMENDMENTS

*Supersedes conflicting parts of `02-build-brief-v1.md`. Resolves every must-fix from the 4 adversarial evaluators (Originality 5.5, Pedagogy 7, Visual 7.5, Technical 8). Where this doc and v1 disagree, THIS doc wins. Builders read both.*

*Author's note on process: the owner explicitly requested skill-tree, proof-of-work, XP/levels/streaks/leagues, and boss-battle mechanics. We KEEP all of them, but rename them in the profession's own language and tune them for a senior audience (per the Originality reviewer). We do not delete what the owner asked for; we make it tasteful.*

---

## A. ORIGINALITY FIXES (the critical lens — 5.5)

### A1. Kill the RPG vocabulary. Rename to the profession's language.
The game *structure* stays; the *labels* come from real engineering culture. Primary UI labels:

| v1 (RPG) | v2 (domain-native, primary label) | Kept mechanic underneath |
|---|---|---|
| Boss Battle | **The Room** (a calibration/decision scenario: "you're in the room — what do you do?") | SJT simulation w/ downstream consequences |
| Quest | **Field Work** (or "the artifact") | Proof-of-work deliverable |
| XP | **Signal** (evidence you've accumulated) | competence-feedback points |
| Skill tree / constellation | **The Star Chart** (an observatory map you navigate) | mastery-gated skill graph |
| Level up | **Cross the threshold** | stage advancement |
| Streaks/Leagues | **Cadence** (personal) / **Cohort** (opt-in peers) | forgiving habit + peer artifact ranking |

Rule: no "boss", "XP", "quest", "grind" in learner-facing copy. Internal code/schema keys may keep short names (`sjt`, `quest`, `xp`) but the RENDERED strings use the domain language above, bilingual.

### A2. Replace Dreyfus-as-headline with industry-native L3–L7. Dreyfus becomes an internal scaffold, no apology.
- **Primary vocabulary shown to users: L3 Developing → L4 Senior → L5 Staff Threshold → L6 Staff → L7 Principal** (the levels.fyi/Dropbox native ladder). No in-product "Dreyfus is contested" disclaimer — that apology is deleted.
- Dreyfus 1–5 behavioral mechanics remain the *internal* scoring scaffold (rules→intuition anchors), never surfaced as the brand. The credibility disclaimer instead says: *"Placement is criterion-referenced against public engineering ladders (Dropbox, levels.fyi) and scored on demonstrated judgment, not a percentile against other users."* That is a strength, not an apology.

### A3. Name and BUILD the one original thesis contribution — lead with it.
**The signature original asset = "The 30% Gauntlet" (working name: *The Hardening Line*).**
The single insight no one else on staffeng.com/Larson/Reilly owns, and it is measurable: *AI now writes the routine 70% of code; promotion past Senior is decided in the 30% AI cannot judge — edge cases, failure design, security, cost, maintainability. We measure your 30%.* This:
- ties the General track and the flagship AI track together (both climb the same Hardening Line);
- aligns with the owner's brand (SPOCG scorecard + "what actually works in production");
- is concretely assessed: a Field Work task hands the learner AI-generated code and scores whether they find the injection flaw / the missing idempotency / the p99 cliff / the DRY-erosion. This is the platform's proprietary measurement of judgment.
Lead landing-page positioning with this, not with a generic "become Staff" promise.

### A4. Escape the dark-premium monoculture with ONE bold creative commitment.
**Committed direction: "The Observatory / Engineering Instrument."** Not generic dark-SaaS. It is an *instrument panel + star chart + engineering blueprint* aesthetic:
- The Star Chart (skill graph) is literally rendered as an **observatory star map** — celestial-chart geometry (declination arcs, catalog tick marks, hand-plotted irregular star positions), NOT evenly-spaced nodes-and-lines.
- Surfaces read as **precision instruments**: segmented/ticked meters, engraved hairlines, monospace catalog numerals, blueprint grid as a structural texture (not decoration).
- This is the "screenshot-worthy" identity: a learner's result screen looks like a **star chart of their career** with an instrument readout, not a SaaS dashboard.
- **Display face: commit to one — `Söhne`-style grotesque is unavailable on Google Fonts, so ship a distinctive open face: primary display = "Instrument Serif" (display-only, high character) for editorial headlines + "Space Grotesk" for structural/section headings.** Drop Fraunces (now a default). Body Inter. Data/numerals JetBrains Mono. This is a committed 3-face system, not a coin flip. (Builders: if Instrument Serif proves too thin for a11y at small sizes, use it ONLY for large hero display and let Space Grotesk carry sub-headings — do not fall back to Inter for headings.)

### A5. Demote the radar; make the calibration gap + "the one missing behavior" the hero.
- Results hero = **the calibration gap + the single highest-leverage behavioral delta per weak axis** ("You operate at L4 on Direction & Influence. The one behavior that separates you from L5: you write design docs, but they don't include Alternatives-Considered + Non-Goals. Here's how."). This is the differentiated, honest, actionable insight.
- The radar/star-chart is the *supporting* visual, always paired with a bar breakdown. It is not the headline.

### A6. Streaks/Leagues — KEEP (owner-requested) but reframed and opt-in, not deleted.
Reviewer wanted deletion; owner explicitly requested them. Resolution: ship as **"Cadence"** (personal, forgiving: weekly targets, freezes, zero shame on on-call weeks, OFF by default) and **"Cohort"** (opt-in peer view that ranks *shipped/peer-reviewed artifacts*, never vanity points). Framed as competence feedback, never a quota. This honors the request without the juvenile PBL failure mode.

### A7. Copy voice is a Phase-0 deliverable with a human-editor pass.
- A named **Voice & Copy guide** ships in Phase 0: authored, opinionated, bilingual EN/ES, editorial. Explicit bans (the tells this brief itself must pass): em-dash flooding, "not X but Y" cadence, citation-stuffing, bold-everything, listicle filler, hype adjectives.
- All learner-facing ES is **authored/human-reviewed, not machine-translated.**

---

## B. PEDAGOGY / ASSESSMENT-VALIDITY FIXES (7)

### B1. Collapse to 3 honest confidence bands, not 5 crisp stages.
~7 items/axis cannot reliably discriminate 5 ordered stages (SEM ~0.7–1.0 logits). **Report placement as one of 3 bands per axis — Developing / Solid / Strong — mapped to a level range (e.g. "Solid: L4–L5 territory"), with the band shown as a RANGE, never a false-precise single stage.** Internally we still compute a continuous theta; we just don't over-claim its resolution.

### B2. Define the fusion rule and cut-scores explicitly.
- Per axis, compute three sub-scores on a common 0–1 scale: `k` = normalized IRT/theta from objective items; `s` = SJT partial-credit ratio; `c` = CBM calibration score.
- **Composite = 0.5·k + 0.35·s + 0.15·c** (objective judgment weighted highest; calibration is a modifier, not a driver). Cut-scores: `<0.4 Developing`, `0.4–0.7 Solid`, `>0.7 Strong`. These are **provisional, disclosed as such**, and logged for recalibration.
- The confident-wrong signal (B4) can lower a band by at most one, and only with ≥2 corroborating signals.

### B3. Measurement uncertainty is first-class.
- Compute a crude per-axis SEM from item count + response consistency; if SEM is high, **widen the displayed range and label the placement "provisional."** Never show a point estimate without its band.
- Ship a tiny Monte-Carlo fixture in the test suite that simulates known-ability responders and confirms the 3-band classifier is acceptably accurate (target ≥80% correct-band). If it fails, add items on decisive axes before shipping.

### B4. Guard the confident-wrong cap.
Require **≥2 corroborating signals** (e.g. two confident-wrongs on the same axis, or a confident-wrong + a low objective score) before capping. A single confident-wrong on one item is **logged and surfaced as "worth revisiting," not acted on** as a hard cap.

### B5. Fix the calibration-gap artifact.
- Only surface a gap when `|self − measured|` **exceeds the combined measurement-error band.**
- Frame probabilistically: *"Your answers suggest you may be underrating your System Design judgment"* — never a hard "you are overconfident" verdict.
- Never surface a gap for small deltas (difference-score unreliability + regression-to-mean).

### B6. Spaced repetition: ship SM-2 / Leitner-with-half-life at launch, not HLR.
Duolingo HLR needs logged training data we don't have at cold-start. **Launch with SM-2 (or Leitner + a per-difficulty initial half-life heuristic).** Log responses; defer any HLR-style model to the same post-launch phase as IRT calibration. Update all v1 text that promised HLR.

### B7. SJT scoring: relabel honestly.
It is an **"author-derived, senior-reviewed key,"** NOT "panel consensus," unless/until a real multi-rater panel keys the items with reported inter-rater agreement. State `n` reviewers and that keys are provisional in the credibility note. Treat Axis 4/5 SJT placements as lower-confidence (construct/multidimensionality caveat).

### B8. Drop the 2-sigma claim.
Delete "2-sigma pedagogical benefit." Cite the defensible mastery-learning effect (~0.5–0.6). Mastery gates stay; the overclaim goes.

### B9. Difficulty `b` is provisional and de-risked.
Author difficulty, then have **≥3 senior engineers independently rate each item's difficulty**, reconcile, and disclose in-product that difficulty weighting is provisional pending real calibration. (In this build: at minimum, a structured second-pass review by a reviewer subagent acting as senior engineer, logged.)

---

## C. TECHNICAL-ACCURACY FIXES (8)

### C1. Fix the consistency "ladder" → lattice / partial order.
In General L5 M1: **do NOT present `linearizable→serializable→SI→causal→eventual` as a total order.** Separate the two axes explicitly:
- **Single-object recency:** linearizable > sequential > causal > eventual.
- **Multi-object transaction isolation:** serializable > snapshot isolation > read committed > read uncommitted.
- **Strict serializability = linearizability ∧ serializability** (the conjunction, not a rung above).
Present as the **Jepsen consistency map / Kleppmann lattice**, and teach that linearizability and serializability are *different guarantees on different axes*, neither implying the other. Cite Jepsen/Kleppmann. This module proves the product's thesis, so it must be correct.

### C2. Rename "Bayesian-prior MLE" → MAP (maximum a posteriori) / penalized MLE.
Throughout the engine spec and assessment blueprint. The math (normal prior stabilizing all-right/all-wrong vectors) is fine; the term was wrong.

### C3. Update DORA 2024 → DORA 2025 + AI Capabilities Model.
Lead with the **2025 DORA cycle**; note that later data nuanced the blunt 2024 "AI hurts stability/throughput" finding. Do not ship a 2026 product citing only 2024 data a senior reader knows has moved.

### C4. Elevate AI security to first-class in the AI track + the hardening Field Work.
Name **prompt injection and the OWASP LLM Top 10** explicitly as part of the "30%." Promote **eval-driven development / LLM-as-judge (with its known failure modes: position bias, verbosity bias, self-preference)** to headline status in the AI track, not a buried mention. This is the credibility-defining AI-eng topic.

### C5. Spaced-repetition launch heuristic — see B6 (SM-2, not HLR). (Same fix, both lenses flagged it.)

### C6. Reframe "learn to never be wrong."
Replace with the concrete behavior: **favor understanding over winning; ask rather than assert; disagree-and-commit.** And soften the code-plateau headline: the *nature and leverage* of technical contribution changes at Staff+ (Solver/Architect still go deep) — technical depth doesn't stop mattering, it stops being *sufficient*. Update the landing thesis copy accordingly so a senior reader can't poke the overclaim.

---

## D. VISUAL / UX FIXES (7.5)

### D1. Specify ONE concrete hero composition (the most-judged surface).
Landing hero, committed:
- **12-col grid, asymmetric 7/5 split.** Left 7 cols: the thesis headline (Instrument Serif display, ~64–80px) + one-sentence sub (Inter) + a single primary action. Right 5 cols: a **live miniature of the Star Chart** (the career star map) partially drawn, with 2–3 instrument readouts (a meter at "L4", a small calibration-gap arc). No 3-equal-cards row anywhere above the fold.
- Vertical rhythm intentionally offset: headline baseline sits ~40% down the viewport, star chart bleeds off the right edge (crop = confidence). Blueprint grid as a faint structural texture behind the right column only.

### D2. Give the star-chart motif a concrete anti-cliché signature.
NOT generic nodes-and-lines. Signature rules:
- **Celestial-chart geometry:** faint declination/right-ascension arcs; catalog tick marks along a curved axis; a subtle ecliptic curve.
- **Hand-plotted, irregular star positions** (authored coordinates, never a uniform grid or force-directed layout — see D4).
- **Star magnitude encodes mastery:** brighter/larger = mastered, dim pinpoint = locked. Edges are thin catalog lines that draw on via `stroke-dashoffset` as prerequisites clear.
- **Defined stroke weights:** 0.75px catalog lines, 1.25px active constellation edges, 0.5px grid arcs.
Blueprint-grid motif (General track): 24px grid, `rgba(255,255,255,.04)` lines, appears as card texture + section dividers only, never full-bleed.

### D3. Commit to one display face — done in A4 (Instrument Serif display + Space Grotesk headings + Inter body + JetBrains Mono data). Pin weights: display 400 only (large sizes), Space Grotesk 500/700, Inter 400/500/600/700, JBMono 400/600.

### D4. Authored node positions live in the content schema.
Add to the star-chart data a per-node layout block:
```jsonc
"chart": { "node": "gen-l5-m5", "x": 0.62, "y": 0.34, "magnitude": 2, "constellation": "reliability" }
```
Coordinates are authored (deterministic across renders, survive reduced-motion final-state, keep content-as-data intact). Builders must NOT randomize or force-direct at runtime.

### D5. Light mode: DROP the toggle for this build.
The system is dark-first (overlay elevation, grain, glow-on-dark don't translate cheaply). Rather than ship a half-spec'd light theme, **this build is dark-only**; the "user-facing light/dark toggle" CI requirement from v1 is removed. (A proper light theme is a future item.) Playwright still verifies contrast ≥4.5:1 and reduced-motion in dark.

### D6. Bilingual visual-layout spec (design for the longer language).
ES runs ~15–25% longer. Rules:
- Radar/star axis labels: max-width + defined 2-line wrap; ship tested abbreviations for the longest ES strings (e.g. "Leveling Up Others & Scope" / "Desarrollo de Otros y Alcance").
- Meters/tooltips: min-width sized to the longest ES string, not EN.
- Playwright visual tests run in BOTH locales; layout must not overflow at longest ES strings.

### D7. Specify the grain technique (raster banned this build).
SVG `feTurbulence`: `type="fractalNoise"`, `baseFrequency=0.9`, `numOctaves=2`, output at ~`opacity: 0.035` over `#080d14`, tiled at 256px, `mix-blend-mode: overlay`. Verify no visible banding on the dark canvas (Playwright screenshot diff). If banding appears, drop opacity to 0.025.

### D8. Govern `<HeroSlot>` imagery under the anti-slop checklist.
For this build, `<HeroSlot>` renders an **authored SVG placeholder only** (a star-chart fragment or blueprint plate). Generated raster hero images are **forbidden in this build**; when the owner later supplies them they must pass the §6 checklist (no stock isometric/blob, no generic AI purple, must match the observatory aesthetic).

### D9. Clarify the gradient rule (resolve the apparent contradiction).
The ban is on **purple/indigo hue + full-bleed hero placement.** 135deg 3-stop accent gradients are **permitted** on skill nodes, radar vertices, and threshold-crossing moments in the track accents (steel/azure for General, clay+cyan for AI). State this explicitly in the token doc so builders don't read the checklist as self-contradictory.

---

## E. NET DECISIONS THAT CHANGE THE BUILD PLAN

1. **Seed level unchanged: General L5 "The Staff Threshold"** — the evidence is deepest there and it proves the thesis. AI track ships as the labeled-flagship *map* (star chart shows both), with ONE real AI slice: the **AI-code-hardening Field Work** (the "30% Gauntlet") is authored for real, so the flagship isn't pure vaporware (addresses A3 + Originality "flagship-vaporware").
2. **Dark-only this build** (D5) — removes the light-theme scope risk.
3. **3 honest bands, not 5 stages** (B1) — the assessment's public claim.
4. **The Hardening Line / "measure your 30%" is the lead positioning** (A3), the Observatory is the lead aesthetic (A4), the calibration-gap + one-behavior-delta is the lead result insight (A5).
5. Phase 0 now also produces the **Voice & Copy guide** (A7) and the **anti-slop checklist** as repo docs; every later phase is gated on both.
6. All v1 text promising HLR, "panel consensus," "2-sigma," "Bayesian-prior MLE," 5 crisp stages, a light toggle, or a consistency total-order is **superseded** by this doc.
