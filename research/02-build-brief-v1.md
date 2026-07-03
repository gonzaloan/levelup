# level-up — BUILD BRIEF (v1.0, the contract)

*Synthesized from 5 research dossiers (the "test" dossier is a null placeholder and is discarded). Every load-bearing decision cites the finding that backs it. Builders: where this brief is specific, do not improvise; where it says "author's judgment," use taste inside the stated guardrails.*

---

## 0. Non-negotiables (read first)

1. **The product must not read as AI-generated.** This is the owner's hardest requirement. It is enforced two ways: an explicit anti-slop lint checklist (§6) applied at every design review, and an *authored point of view* in copy, curriculum, and illustration. Substance — real difficulty, real judgment, real artifacts — is the aesthetic this audience respects (Gamification dossier, "anti-patterns"). Generic templated content is itself a slop tell.
2. **Do not grade primarily on code.** Staff+ work has weeks-to-years feedback loops and is about judgment (Staff+ dossier, "feedback loop" finding). Assessment is built on situational-judgment items and written artifacts, not auto-graded LeetCode (Assessment dossier).
3. **Rewards are informational, never controlling.** Every reward is phrased as competence feedback ("you can now reason about consistency tradeoffs"), never a bribe/quota (Gamification dossier, SDT/Cognitive Evaluation Theory). Streaks/leagues are off-by-default.
4. **Stack constraints hold:** Next.js static export, content-as-data (JSON), localStorage progress, hand-authored inline SVG. No server, no runtime DB. The assessment must therefore run fully client-side (Assessment dossier: no IRT calibration sample → "barely adaptive" MST router).

---

## 1. Product thesis & positioning

**The definitive guide to the part of engineering that coding practice cannot teach you.**

The market is saturated with tools that make you a faster coder (LeetCode, Copilot, bootcamps). level-up occupies the lane none of them own: the judgment, scope, direction, and leverage that actually move an engineer from Senior toward Staff/Principal — and the durable craft AI is making *more* valuable, not less.

**The sharp, evidence-backed claim we lead with** (and repeat without apology):

> Getting better at writing code will not promote you past Senior.

This is not opinion. Dropbox's public ladder states outright that **code-fluency expectations plateau at L4 and software-design expectations plateau at L5**; growth above is scope, strategy authority, and talent development (Staff+ dossier, "Dropbox plateau" finding). levels.fyi corroborates: coding *decreases*, ambiguity *increases*, blast radius *widens* as you climb; Senior is the terminal "career level," Staff is <10%, Principal is a rounding error (Staff+ dossier, "convergent axes" + "title hierarchy"). Going Senior→Staff+ is a **minority path requiring a deliberate behavioral change** — which is precisely why it justifies a dedicated platform.

**The 2026 twist that makes this urgent, not evergreen:** AI raises the floor on code generation and simultaneously *degrades* the things that separate a Staff engineer from a prompt. DORA 2024: AI lifts individual productivity but **hurts team-level delivery stability and throughput** (General dossier). GitClear (153M lines): AI-assisted code churn is projected to double, duplication is rising, reuse is falling (General dossier). Addy Osmani's "70% problem": AI nails the routine 70% and leaves the production-hardening 30% — edge cases, security, a11y, perf, maintainability — squarely human, and it **helps seniors more than juniors** because juniors can't judge the output (General dossier). So the platform's promise: *we train the durable 30% and the judgment/leverage/direction that AI cannot deliver.*

**Differentiators (the moat):**

- **A real diagnostic, not a Buzzfeed quiz.** Difficulty-weighted scoring (a hard item right is worth more), confidence-calibration that catches Dunning-Kruger, and a criterion-referenced Dreyfus placement with a *behavioral verdict*, not a percentage (Assessment dossier).
- **Proof-of-work that is non-fakeable.** Success = a design doc that survives a staff-derived rubric, an incident sim whose decisions have downstream consequences, a hardening quest that finds the security hole in AI-generated code — not "you watched the video" (Gamification dossier, "credibility for engineers").
- **Two tracks, one spine.** General Engineering (the durable foundation) and the flagship **Real World AI Engineering**, both climbing the same 5-axis competency model so progress is comparable and honest.
- **Signature gamification tuned for adults.** A hand-drawn constellation skill map, instrument-grade meters, Situational-Judgment "boss battles" scored against a *panel consensus* (multiple defensible answers) — never confetti, never mascots (Gamification + Visual dossiers).
- **It tells you the truth.** The radar is designed to be honest, not flattering; the roadmap leads with your *weakest* axes and names the exact behavioral delta to the next stage (Assessment dossier).

**Positioning statement (for site copy):** *level-up is the operating manual for the second half of an engineering career — the transition from "great at the task" to "shapes what the team does and why." Built by people who have actually been in the room.*

---

## 2. The 5 competency axes (the assessment spine)

### Architectural decision on the axis set (opinionated)

The Staff+ dossier proposes leadership-only axes (Scope, Judgment, Technical Direction, Influence, Leveling Up Others). The Visual/Assessment dossiers use placeholder skill-domain labels (Technical Depth, System Design, AI Engineering, Leadership/Influence, Craft & Delivery). **Both are wrong for our actual job**, which is a radar that must (a) work for the *whole* Junior→Principal journey, (b) work for *both* tracks, and (c) stay comparable across users (fixed axis order — radar area distorts if you reorder; Visual dossier).

**Decision:** 5 fixed axes, each carrying a Dreyfus 1→5 progression where the *upper stages encode the Staff+ behavioral shift* (per Engineering Ladders' rule "each level includes the previous," so scoring is a monotonic threshold, not additive points — Assessment dossier). We **do not** make "AI Engineering" its own axis: a fixed axis that is N/A for every General-track user would always read low, distorting the radar and violating the area-distortion guidance. Instead **AI depth lives inside Axis 1 (Technical Depth), track-flavored.** This supersedes the placeholder labels in the visual mockups.

The five map cleanly onto the convergent industry frameworks — Reilly's 3 pillars + Larson's 5 responsibilities + the levels.fyi/Dropbox axes — so they are externally defensible (Staff+ dossier, "implications").

| # | Axis | What it measures | Maps to |
|---|------|------------------|---------|
| 1 | **Technical Depth** | Command of the primitives *as tradeoff judgment*, not trivia. General: consistency/PACELC, concurrency, distributed building blocks. AI track: model/inference/RAG/eval fundamentals. | levels.fyi "craft"; plateaus at Senior — deliberately |
| 2 | **Systems & Architecture Judgment** | Choosing the *simplest sufficient* design; knowing when NOT to use a pattern; reversible-decision economics. | Reilly Big Picture; Larson "technical direction" |
| 3 | **Execution & Delivery Craft** | Shipping reliably: trunk-based dev, testing, SLO/error-budget thinking, code review as craft, design docs, operational ownership. | Reilly Execution; DORA |
| 4 | **Direction & Influence** | Setting technical direction, *writing* strategy/RFCs, influence-without-authority, being "in the room." | Reilly Big Picture; Larson responsibilities 1,3 |
| 5 | **Leveling Up Others & Scope** | Sponsorship (not just mentorship), strategic glue, blast radius, growing the org's capability. | Reilly Leveling Up; Larson responsibilities 2,5 |

### Dreyfus behavioral anchors (Novice→Expert) per axis

Anchors are keyed on the Dreyfus mechanics — *rules→intuition* and *detachment→involvement* (Assessment dossier). A placement is **a stage number PLUS a behavioral sentence** — that is what makes it a leveling framework, not a score. We present Dreyfus as a *descriptive scaffold* (it is empirically contested re: discrete stages — Assessment dossier), and ground the actual number in item performance + judgment + calibration.

**Axis 1 — Technical Depth**
- **1 Novice:** Applies patterns by rote from tutorials; picks tech by popularity; cannot predict failure modes.
- **2 Adv. Beginner:** Knows named patterns (idempotent receiver, quorum, cache-aside) but applies them situationally without weighing cost.
- **3 Competent:** Reasons about consistency/latency tradeoffs deliberately (PACELC over CAP); picks the *weakest consistency model that satisfies the invariant*.
- **4 Proficient:** Reads a system's failure surface intuitively (thundering herd, cache addiction, dual-write); designs the *failure behavior*, not just the happy path.
- **5 Expert:** Fluent across the distributed-systems primitive space; invents/adapts primitives; is the person others' deep problems escalate to.

**Axis 2 — Systems & Architecture Judgment**
- **1:** Reaches for the most elaborate architecture (microservices/CQRS) as default.
- **2:** Can design a system to spec but doesn't surface alternatives or non-goals.
- **3:** Weighs alternatives explicitly; understands the "Microservice Premium"; can justify monolith-first.
- **4:** Frames architecture as reversible-decision economics; refuses patterns when contraindicated (CQRS outside a bounded context); scopes blast radius consciously.
- **5:** Sets architectural direction for a domain via *earned* authority; his/her designs become the org's reference.

**Axis 3 — Execution & Delivery Craft**
- **1:** Long-lived branches, manual deploys, tests as afterthought.
- **2:** Follows team's CI/CD; writes tests when asked; reviews for style.
- **3:** Practices trunk-based dev + feature flags + small batch; writes SLOs backward from user journeys using percentiles; reviews for design, not typos.
- **4:** Owns operational reliability via error-budget control loop; treats code review and refactoring as craft; hardens AI-generated code (finds the 30%).
- **5:** Sets delivery standards that move DORA outcomes org-wide; designs the org's reliability economics.

**Axis 4 — Direction & Influence**
- **1:** Executes assigned tickets; opinions live only in Slack.
- **2:** Writes design docs when required; advocates for own team's local optimum.
- **3:** Writes strategy docs/RFCs with real Alternatives-Considered + Non-Goals; disagrees-and-commits.
- **4:** Influences without authority — "yes, if" not gate-keeping "no"; blends own vision with peers'; "learns to never be wrong" (shifts to understanding over winning); gets pulled into the room.
- **5:** Sets multi-year, multi-team technical strategy; represents *all of engineering*; makes unpopular calls and holds them.

**Axis 5 — Leveling Up Others & Scope**
- **1:** Heads-down on own work; blast radius = own tickets.
- **2:** Answers questions, mentors juniors reactively.
- **3:** Deliberate mentorship; does glue work but doesn't yet manage its visibility.
- **4:** *Sponsors* — spends own capital: hands off stretch/lead work, amplifies others in rooms they're not in, cites their work to influential groups (Hogan behaviors); does glue *strategically* and keeps core contributions visible.
- **5:** Grows the org's capability as a legacy; blast radius = multiple teams/org; talent development is a primary output.

---

## 3. Assessment blueprint (fully client-side)

### Three signal sources per axis, combined into one Dreyfus placement (Assessment dossier)

**(A) Objective knowledge/judgment items — difficulty-weighted.** Use a 1PL/Rasch logistic with **author-assigned** difficulty `b` (no calibration sample needed):
```
P(correct) = 1 / (1 + exp(-(theta - b)))
```
`theta` = ability, estimated by a small grid/Newton MLE over the response vector with a **normal prior (mean 0)** to stabilize all-right/all-wrong vectors (MLE alone diverges on those). Getting a hard item (`b=+1`) right is worth more than an easy one (`b=-1`) — this is *the* thing that separates us from a Buzzfeed quiz. ~15 lines of JS.

**(B) Situational Judgment Tests (SJT)** — the *primary* instrument for Axes 2, 4, 5 (recall MCQ cannot distinguish seniority there). Format: realistic scenario, multiple **defensible** responses, "what WOULD you do" framing + a required rationale (reduces faking). **Graded key**, not single-right-answer: best = full, defensible-but-suboptimal = partial, harmful = zero/negative. Score against a **panel-of-senior-engineers consensus** (consensual scoring). The multi-answer defensible scoring is itself a sophistication signal (Gamification + Assessment dossiers).

**(C) Confidence calibration — Certainty-Based Marking (CBM).** Every objective item carries a confidence tag; canonical 3-level proper scoring rule:
| Confidence | Correct | Wrong |
|---|---|---|
| Low (C1) | +1 | 0 |
| Mid (C2) | +2 | −2 |
| High (C3) | +3 | −6 |
The asymmetric penalty makes honest reporting the score-maximizing strategy. **A confident-wrong answer is the highest-signal event:** it caps the axis placement (a Dreyfus over-placement) and spawns a "misconception to unlearn" roadmap item from that distractor's stored rationale (Assessment dossier).

### Placement model
- **Criterion-referenced**, against the fixed Dreyfus/Engineering-Ladders anchors above — *never* norm-referenced percentile against other users. Each level subsumes the lower ones → scoring is a **monotonic threshold**, not additive points. Matches how real promotion calibration works: compare to the ladder, not to peers; read the written evidence, don't reward the pitch (Assessment dossier, "Larson calibration").

### Adaptive engine: "barely adaptive" MST router (NOT true CAT)
We have no pretested item bank, so a real IRT-CAT is infeasible at launch (Assessment dossier). Ship **Multistage Testing**:
- Author **6–9 items per axis across 3 difficulty tiers** (−1 / 0 / +1).
- Start each axis at the **mid tier**; branch **up** after a correct+confident answer, **down** after wrong/low-confidence.
- **Fixed-length stopping:** ~7 items/axis → **~35–45 items total, ~20–25 min.** Predictable, bounded, can't exhaust the bank.
- **Log every response now** so we can calibrate real IRT `a/b/c` parameters later.

### Self-assessment & the calibration gap
Ask self-rating in **absolute, behavior-anchored terms** ("I can design a system to handle 10× traffic unaided"), *not* relative ("better than peers") — this reduces the Dunning-Kruger/regression-to-the-mean artifact (Assessment dossier). Then compute and **display** per-axis:
```
calibration_gap = self_reported_level − measured_level
```
Surface over- and under-confidence as a *named, honest insight*: "You rate yourself Proficient on System Design; your answers place you at Competent — here's the gap."

### Radar + roadmap computation (deterministic, no LLM required)
- **Radar:** bespoke inline SVG, 5 fixed-order axes, single current-profile shape at ~15–20% fill, dotted **target-level overlay**, per-axis accent vertices. Always paired with a bar/lollipop breakdown for accessibility and to counter area-distortion misreading (Visual dossier).
- **Roadmap generator:** for each axis below target, concatenate: (missed-item rationales) + (confident-wrong misconceptions, prioritized first) + (the *next Dreyfus stage's behavioral descriptor* as the goal). Lead the results with the **weakest 1–2 axes** framed as "highest-leverage growth." Every distractor stores a "why this is wrong" rationale + a linked module — **the rationale store IS the roadmap content** (Assessment dossier). An LLM may *narrate* the roadmap later; it is never required to *compute* it.
- **Archetype diagnostic (bonus surface):** a short branch that maps the learner to Larson's Tech Lead / Architect / Solver / Right Hand, because each needs a different roadmap emphasis (Staff+ dossier). Present as "your current shape" + "your aspirational shape."

### In-product credibility disclaimer
State plainly that Dreyfus is a *descriptive growth scaffold* (discrete stages are contested) and that rigor comes from the scoring model, not the stage theory. Protects credibility with a skeptical audience.

---

## 4. Curriculum map — both tracks

Structure: **Track → Level (Dreyfus-banded) → Module → Topics**, every module tagged with its primary + secondary axis and a graded deliverable. Levels align to the industry bands: **L3 Developing → L4 Senior (craft plateau) → L5 Staff Threshold → L6 Staff → L7 Principal.**

### Track A — General Engineering (the durable spine)

Organized as the 4 clusters from the General dossier, threaded with a "what's changing in 2026" lens in every module.

**L3–L4 (Foundations → Senior craft)**
- *Technical Depth:* concurrency, data modeling, the distributed-systems primitive catalog by name (idempotent receiver, quorum, lease, water marks, WAL, request pipeline/backpressure — Unmesh Joshi). [Axis 1]
- *Delivery Craft:* trunk-based dev + feature flags + small batch; testing strategy; code review as craft; DORA four keys as a scoreboard. [Axis 3]

**L5 — The Staff Threshold** ← **SEED THIS LEVEL DEEPLY (see justification below)**
- **M1 · Consistency & Tradeoffs:** PACELC over CAP; the consistency ladder (linearizable→serializable→SI→causal→eventual); pick the weakest model that holds the invariant. [Axis 1/2] · *Deliverable:* SJT set + a written "consistency choice" defense.
- **M2 · Distributed Transactions Without 2PC:** sagas (choreography vs orchestration), the outbox/idempotent-receiver/compensation triad, and *when not to split the service*. [Axis 2]
- **M3 · Architecture Restraint:** the Microservice Premium; CQRS *with its contraindications* (Fowler's warning; bounded-context only); reversible-decision economics. [Axis 2] · *Deliverable:* design doc with mandatory Alternatives-Considered + Non-Goals.
- **M4 · Caching & Failure Design:** cache-aside vs read/write-through, soft/hard TTL, request coalescing (thundering herd), negative caching, "cache addiction," testing with caching disabled. [Axis 1/3]
- **M5 · Reliability Economics:** SLIs→SLOs→SLAs, percentiles not averages, error budgets as the release-velocity control loop; **wide-event / high-cardinality observability** (Observability 2.0), *not* the legacy three pillars. [Axis 3] · *Deliverable:* write SLOs backward from a user journey + compute an error budget.
- **M6 · Design Docs & RFCs:** Google-style sections; the Squarespace "yes / yes, if" approver model + lightweight Architecture Review. [Axis 4] · *Deliverable:* an RFC that survives a staff-derived rubric — **the spine artifact of the platform.**
- **M7 · The Judgment of What Matters:** Larson's anti-pattern taxonomy — snacking / preening / chasing ghosts vs existential/high-leverage/finishing work. [Axis 2/4] · *Deliverable:* prioritization SJT on a realistic backlog.
- **M8 · Influence Without Authority:** stay aligned with (proxied) authority; to lead you must follow; "learn to never be wrong"; disagree-and-commit; running a design review. [Axis 4]
- **M9 · Leveling Up Others:** sponsorship ≠ mentorship (Hogan's concrete behaviors); **Being Glue** as a double-edged sword (do it strategically, keep it visible, negotiate it into your recognized role). [Axis 5]
- **Boss Battle:** incident-command + design-review SJT simulation with downstream consequences.

**L6–L7 (Staff → Principal):** multi-team strategy, org-wide standards, the four archetypes as distinct operating modes, portfolio-level judgment. (Mapped, not seeded in this build.)

### Track B — Real World AI Engineering (flagship)

*Mirrors the same 5 axes and level structure*, with Technical Depth flavored toward: model/inference fundamentals, RAG architecture, evals as first-class engineering, agent/tool-use design, prompt & context engineering, and AI-system reliability (hallucination budgets as an SLO analog). Delivery craft: hardening AI-generated code (the "30%"), oversight/guardrails for agents. **Curriculum is mapped to the same axes but is NOT seeded deeply in this build (see below).**

### Which ONE level we seed deeply — and why

**Seed: Track A (General Engineering), L5 "The Staff Threshold."**

Justification (defensible on three grounds):
1. **Evidence coverage.** We have deep, citable research for exactly this content — *all* of the Staff+ dossier plus the entire General-engineering dossier (SLOs, PACELC, sagas, CQRS restraint, design docs, wide events, DORA/GitClear). We have **no** AI-technical research dossier; seeding the AI track deeply would mean guessing, which violates non-negotiable #1 (guessed content reads as AI slop).
2. **Thesis sharpness.** L5 is where the product's core claim bites hardest — "code plateaus at L4, judgment is what promotes you." Seeding here lets the very first shipped content *prove the thesis* rather than assert it.
3. **Differentiation.** This is the content no LeetCode/bootcamp competitor has: tradeoff judgment, restraint, written influence, sponsorship. It showcases every signature mechanic (SJT boss battles, design-doc proof-of-work, prioritization scenarios) in one level.

The flagship AI track remains the marketing headline and gets its full level/module *map* (skeleton content) so the constellation renders both tracks — but the **deep, authored, graded content ships for General L5 first.** Ship where the evidence is deepest; expand the flagship in phase 2 once we commission the AI research dossier.

---

## 5. Gamification design (tuned for Staff/Principal engineers)

The **learning-science core is the spine, not a skin** (Gamification dossier). Every unit ends in **retrieval** (produce/recall, not recognize — the testing effect is the single highest-leverage mechanic); concepts **resurface on an adaptive spaced schedule** (model per-skill memory half-life à la Duolingo HLR — *not* fixed Leitner boxes); quests **interleave** problem types so learners practice *recognizing which approach applies* — the real senior skill. We **market the friction**: "this feels harder on purpose; your in-session score may look worse while retention improves" (desirable difficulties → a trust signal for this audience). Keep every task inside the achievable challenge band (flow channel).

### The 4 signature mechanics

**1. Skill Tree / Constellation.** A *specialization constellation* with genuine tradeoffs (e.g., Distributed Systems vs Developer Experience vs ML Infra paths) — the meaningful **choice IS the autonomy-support** that SDT says sustains motivation. Show the full aspirational map; **gate unlocks on demonstrated mastery (~90% on prerequisites, with corrective retry loops** — Bloom). Real gates give the 2-sigma pedagogical benefit and the "earned" feeling.
- *Learning science:* mastery learning (effect ~0.59); SDT autonomy; flow (visible challenge ladder).
- *Anti-patterns:* unlock-everything-linearly trees (glorified progress bar); fake gates you just click past.

**2. Proof-of-Work Quests.** Success is **non-fakeable**: a design doc scored against a staff-derived rubric, a hardening quest that must find the security hole/DRY violation in AI-generated code (the "30%"), a "predict the output before we tell you" generation-effect task. Use **test-before-teach**, but **scaffold net-new concepts with a worked example first** (the generation effect weakens for unfamiliar material). Structure judgment content via **cognitive apprenticeship**: expert thinks aloud (model) → learner articulates *why* (not just what) → compare against annotated Staff write-up (reflect) → supports fade.
- *Anti-patterns:* "complete the module" as proof; pure multiple-choice recall (read as theater); open-ended "build whatever" with no feedback loop.

**3. XP / Streaks / Leagues — OPTIONAL, off by default.** PBLs have a documented failure mode: they can raise performance while *lowering* motivation and participation (Gamification dossier). For a senior audience: XP is framed as competence feedback, never a quota; streaks are **forgiving** (weekly targets, freezes, zero shame on on-call weeks); leagues, if shown at all, rank *shipped/peer-reviewed artifacts*, not vanity XP.
- *Anti-patterns:* unforgiving daily streaks; Black-Hat scarcity/urgency; a leaderboard of raw XP among Staff engineers (reads juvenile).

**4. Boss Battles.** Situational Judgment Tests for Staff judgment (design review, incident command, arch decision): realistic scenario, multiple **defensible** responses, scored against **panel consensus**, not one "right" answer. Downstream consequences (your earlier call changes the later scenario state).
- *Anti-patterns:* single-right-answer judgment items; boss = a harder quiz.

**Universal reward rule (SDT / Cognitive Evaluation Theory):** every reward is *informational* ("you can now reason about X"), never *controlling*. Reserve the overshoot spring easing for genuine reward moments (level-up, node unlock) so celebration feels earned; keep everyday progress calm.

---

## 6. Visual & UX design direction

Evolve get-certified's system — do **not** copy it (Visual dossier). Keep the deep-navy premium bones; assert level-up's own identity.

### Type system
- **Display:** a higher-personality face than get-certified's DM Serif Display (a top slop tell is "Inter everywhere," and DM Serif is common). **Recommend Fraunces (variable serif)** for editorial character, or a bold grotesque as an alternate. **Never headline in Inter.**
- **Body:** Inter.
- **Data/numerals/XP/levels:** JetBrains Mono as an *intentional "instrument/terminal" voice* — every figure is instrument-grade.
- Drive the pairing with **contrast** (weight/size/structure) so faces don't compete.

### Color / theme
- **Canvas:** keep get-certified's `#080d14` (never pure black — harsh contrast, kills depth). Build elevation via **semi-transparent white overlays** layered on the dark surface, not drop shadows (Material dark; get-certified already does this). Body text ≥4.5:1.
- **Tokens encode intent, not lightness** (Geist): convert accents to semantic 10-step scales; ship both sRGB hex **and** oklch()/P3 variants.
- **Radii tightened** (Geist discipline, tighter than get-certified's 16–24px): ~**6px controls / 10–12px cards / 9999px pills.** 16px only for fullscreen.
- **Spacing rhythm:** strict 4px scale — 8 within a group, 16 between groups, 32–40 between sections.
- **Two-track identity = accent + motif split on one shared shell:**
  - **General Engineering:** cool steel/azure (evolve CLF `#1976d2`) + **blueprint-grid motif** (foundations & systems).
  - **AI Engineering (flagship):** **Anthropic clay `#d97757` + cyan `#00bcd4` signal** + **neural-constellation motif.** Using clay instead of the generic AI purple is *itself* an anti-slop statement.
  - **Reserve `#7c5cff` (CCA violet) — it is the exact AI-slop purple.** Tertiary/locked states only; never a track headline.
- Accent gradients (3-stop, 135deg, get-certified pattern) appear **sparingly** — skill nodes, radar, level-up moments only. No full-bleed gradient hero.

### Layout principles
- Generous negative space, mostly-monochrome dark canvas (Linear: "make them big or small, but give them room to breathe").
- **Intentional asymmetry on a real grid** — reject the centered-hero-+-3-equal-cards template outright.

### SVG illustration & the two hero visualizations
- **Skill tree = hand-tuned SVG constellation** (NOT force-directed): intentionally slightly-irregular node layout, thin edges that light up via `stroke-dashoffset` draw-on as prerequisites clear, dim/desaturated locked nodes, accent-glow unlocked nodes (`0 0 30px` accent), a pulsing current frontier, faint starfield/grain behind, custom tooltips. **This is the memorable centerpiece — invest here.**
- **Radar = bespoke inline SVG** (§3): 5 fixed-order axes, ~15–20% fill, dotted target overlay, spring draw-on, paired bar breakdown. **Never a default Chart.js radar.**
- All icons custom SVG; no stock isometric/blob/Corporate-Memphis art.

### Motion (exact numbers)
- Custom cubic-beziers only. Keep `--spring: cubic-bezier(.2,1.4,.4,1)` and `--eout: cubic-bezier(.16,1,.3,1)`.
- Everyday transitions: **ease-out, <300ms.** Springs reserved for reward moments.
- All animations **interruptible**; **never animate keyboard-repeated actions**; animate only transform+opacity.
- **Full `prefers-reduced-motion` path:** swap movement for opacity/instant final states (constellation shows final lit state instantly).

### 6 signature details (the visual fingerprint — build them intentionally, reuse them)
1. Hand-drawn observatory **constellation skill tree**.
2. Bespoke **5-axis radar with dotted target overlay** + calibration-gap.
3. **Instrument-grade mono numerals** + segmented/ticked SVG progress meters (not rounded confetti bars).
4. **Grain + inner-highlight dark surfaces:** subtle film grain over `#080d14`, hairline `rgba(255,255,255,.06–.08)` borders, inset top 1px white ~8% highlight on cards.
5. **Custom-tuned spring easing** on level-up / node-unlock only.
6. **Per-track motif:** blueprint-grid (General) vs neural-constellation (AI).

### AI-slop tells to avoid — enforce as a design-review checklist (Visual dossier)
- [ ] No purple/violet→indigo 135deg hero gradient
- [ ] No Inter-for-everything (display face required)
- [ ] No centered-hero + exactly-3-equal-rounded-cards template
- [ ] No emoji bullets (✨🚀🎯)
- [ ] No glassmorphism-everywhere
- [ ] No uniform 16px+ radii on everything
- [ ] No stock isometric/3D-blob / Corporate-Memphis art
- [ ] No dead-centered vertical rhythm with zero asymmetry
- [ ] No generic soft drop shadows on cards (use overlay elevation)
- [ ] No faux "Trusted by 10,000+" / logo salad
- [ ] No gradient headline text
- [ ] No listicle filler — every section has an opinion
- [ ] No cartoon mascots / confetti-as-substance / fake urgency

Also enforce: contrast checks + a user-facing light/dark toggle (NN/g) in CI/Playwright visual verification.

---

## 7. Information architecture, routes, content schema, i18n

### Routes (Next.js static export, `/[locale]/...`)
```
/[locale]                         Landing (authored POV, the thesis)
/[locale]/assess                  Diagnostic intro + archetype self-select
/[locale]/assess/run              MST router (client-side, ~35–45 items)
/[locale]/assess/results          Radar + calibration gap + roadmap
/[locale]/map                     The constellation (both tracks)
/[locale]/track/[track]           Track overview (general | ai-engineering)
/[locale]/track/[track]/[level]   Level view (levels → modules)
/[locale]/module/[moduleId]       Module: topics, retrieval, quest
/[locale]/quest/[questId]         Proof-of-work quest / design-doc workbench
/[locale]/boss/[bossId]           Boss battle (SJT simulation)
/[locale]/me                      Progress, streaks (opt-in), roadmap
```
`locale ∈ {en, es}`. Static-exported for both locales. Progress in `localStorage`, keyed by locale-independent IDs.

### Content-as-data schema sketch (JSON)

```jsonc
// module.json
{
  "id": "gen-l5-m5-reliability",
  "track": "general",
  "level": "L5",
  "axis": { "primary": 3, "secondary": 4 },
  "dreyfusTarget": 4,
  "title": { "en": "Reliability Economics", "es": "Economía de la Fiabilidad" },
  "topics": [ { "id": "slo-backward", "body": { "en": "...", "es": "..." } } ],
  "retrieval": ["item-slo-01", "item-slo-02"],   // forces recall, not recognition
  "quest": "quest-slo-budget",
  "prerequisites": ["gen-l5-m4-caching"],         // mastery gate (~90%)
  "resurfaces": ["item-cap-03"]                    // adaptive spaced review
}

// item.json  (objective/CBM item)
{
  "id": "item-slo-01",
  "axis": 3,
  "difficulty": 0,                    // -1 | 0 | +1 (author-assigned b)
  "type": "mcq",
  "stem": { "en": "...", "es": "..." },
  "options": [
    { "id": "a", "text": {...}, "correct": true,
      "rationale": { "en": "why right", "es": "..." } },
    { "id": "b", "text": {...}, "correct": false,
      "misconception": "avg-not-percentile",       // powers roadmap
      "rationale": { "en": "why wrong", "es": "..." },
      "resource": "gen-l5-m5-reliability#slo-backward" }
  ],
  "confidence": true                   // CBM 3-level enabled
}

// sjt.json  (boss / judgment item — graded key, panel consensus)
{
  "id": "boss-incident-01",
  "axes": [2, 4],
  "scenario": { "en": "...", "es": "..." },
  "responses": [
    { "id": "r1", "text": {...}, "score": 3, "verdict": "best",
      "rationale": {...} },
    { "id": "r2", "text": {...}, "score": 1, "verdict": "defensible-suboptimal",
      "rationale": {...} },
    { "id": "r3", "text": {...}, "score": -2, "verdict": "harmful",
      "rationale": {...} }
  ],
  "requiresRationaleInput": true,      // "what WOULD you do" + why
  "downstream": { "r3": "boss-incident-01b" }  // consequence branch
}

// quest.json  (proof-of-work)
{
  "id": "quest-rfc-01",
  "axis": 4,
  "kind": "design-doc",                // design-doc | harden-code | predict-output
  "prompt": { "en": "...", "es": "..." },
  "rubric": [                          // staff-derived, gradable client-side or self/peer
    { "criterion": "alternatives-considered", "weight": 3 },
    { "criterion": "non-goals", "weight": 2 }
  ],
  "workedExampleFirst": true           // scaffold before generation for net-new
}
```

### i18n approach (full EN/ES)
- **Every learner-facing string is a `{en, es}` object inside content-as-data** (not just UI chrome). Curriculum, item stems, rationales, SJT scenarios, roadmap descriptors — all bilingual at the data layer.
- UI chrome via a standard message catalog (`en.json` / `es.json`).
- **ES is authored, not machine-translated** — machine translation reads as slop and this is a bilingual product by design. Budget human translation/review in the build plan.
- Locale-independent IDs so `localStorage` progress and the assessment engine are locale-agnostic; switching language mid-journey never loses progress.
- `hreflang` + static export per locale for SEO.

---

## 8. Build plan for the fleet

Definition of Done applies to *every* phase: passes the §6 anti-slop checklist; `prefers-reduced-motion` + light/dark + ≥4.5:1 contrast verified in Playwright; both EN and ES present and human-reviewed; no placeholder/lorem; content has an authored point of view.

**Phase 0 — Design system & tokens.**
Produces: token file (semantic 10-step accents, hex+oklch, tightened radii, 4px spacing), type system (Fraunces/Inter/JetBrains Mono), motion tokens, grain/overlay-elevation primitives, the documented 6 signature details, the anti-slop lint checklist as a repo doc.
DoD: a component gallery renders in both track themes; slop checklist passes.

**Phase 1 — Assessment engine (the credibility core).**
Produces: client-side MST router; 1PL scorer with Bayesian-prior MLE; CBM scoring; graded-SJT scorer; calibration-gap computation; deterministic roadmap generator; response logging to localStorage for future IRT calibration.
DoD: a fixed test fixture of items produces correct, reproducible placements + roadmap; unit tests on scorer edge cases (all-right/all-wrong don't diverge).

**Phase 2 — Two hero visualizations.**
Produces: bespoke SVG radar (fixed axes, target overlay, paired bar view, spring draw-on) and the hand-tuned constellation skill tree (mastery gates, glow/dim states, edge draw-on, starfield/grain, tooltips).
DoD: both render from content-as-data, both have reduced-motion paths, both are demonstrably not library defaults.

**Phase 3 — Seed content: General L5 "Staff Threshold."**
Produces: 9 fully-authored bilingual modules (M1–M9) with retrieval items, distractor rationales, mastery gates; the item bank (6–9 items/axis × 3 tiers) for the diagnostic; SJT boss battle(s); the RFC/design-doc proof-of-work quest with staff-derived rubric; the AI-code-hardening quest.
DoD: a learner can go diagnostic → radar → roadmap → complete a module with retrieval → pass a mastery gate → attempt the boss → produce a graded design doc — end to end, both locales.

**Phase 4 — Gamification layer.**
Produces: XP-as-competence-feedback, opt-in forgiving streaks, instrument-grade meters, level-up spring moments, archetype diagnostic.
DoD: all rewards are informational not controlling (design-review sign-off); streaks off by default; no PBL slop.

**Phase 5 — Skeleton map for the flagship AI track + full IA.**
Produces: AI Engineering track level/module *map* (skeleton, so the constellation shows both tracks and the flagship is visible), all routes, i18n catalogs, `/me` progress.
DoD: navigation complete; AI track clearly labeled "flagship" with its neural-constellation motif; no fabricated deep AI content (that awaits a commissioned AI research dossier — phase 6, out of scope here).

**Phase 6 (noted, not in this build):** commission the AI-technical research dossier, then seed an AI-track level deeply, then migrate the assessment to true IRT once enough responses are logged.

---

*This brief is the contract. Where a builder believes a cited decision is wrong, escalate with the counter-evidence — do not silently deviate. The one rule above all others: if it could have been generated by a template, it is wrong.*