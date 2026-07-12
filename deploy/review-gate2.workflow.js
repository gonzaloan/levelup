export const meta = {
  name: 'levelup-experience-gate',
  description: '4 adversarial reviewers on the learning-experience overhaul (progression, builder, widgets, engagement); fix confirmed blockers; loop until all PASS',
  phases: [{ title: 'Audit' }, { title: 'Reverify' }, { title: 'Fix' }],
}

const ROOT = 'C:/Projects/personal/level-up'

const CONTEXT = `
PROJECT: level-up — Next.js 15 static-export ("output: export"), bilingual (EN/ES),
gamified learning platform (Junior→Principal). Working copy: ${ROOT}. LIVE at
levelup.skillrealm.dev (localStorage-only, no backend). Build contract with HARD
BARS: ${ROOT}/docs/DEFINITIVE-BUILD-CONTRACT.md — READ IT FIRST.

THIS ITERATION overhauled the LEARNING EXPERIENCE. What changed (review THIS, not the whole app):
1. LEVEL-FIRST PROGRESSION ("The Climb"): src/lib/climb.ts (pure engine: L3→L7 stages,
   per-level role mandates LEVEL_MANDATE, breadth-quorum ascent gate = clear 4 of 6 domain
   checkpoints to rise), src/components/ClimbView.tsx + LearnShell.tsx. /learn now DEFAULTS to
   the Climb (you-are-here header + next action + gated stage cards); "Browse by domain" toggle
   keeps the old LearnHub. tests/climb.test.ts.
2. ARCHITECTURE BUILDER (constructive check): src/lib/build.ts (pure deterministic graph grader:
   required nodes/edges present, forbidden anti-pattern edges absent, partial credit + per-criterion
   feedback), src/components/checks/ArchitectBuilder.tsx (tap-to-place FIRST per WCAG 2.5.7, +
   keyboard + drag enhancement; SVG edges). src/content/data/builds.json (6 challenges). New /build
   route (BuildGallery). Wired as a graded step in CheckpointPlayer.tsx. tests/build.test.ts.
3. WIDGETS: 3 new parameterized widgets (src/components/viz/SpectrumSlider, DecisionFlow,
   TradeoffCurve) registered in viz/index.ts; mapped to 59 more concepts in lessons.json (now 95/152
   have an interactive widget). Rendered by lesson/ConceptPane.tsx via concept.visual.params.
4. NARRATIVE: landing (src/app/[locale]/page.tsx) + climb reframed around role mandates.
   Styles: src/app/styles/20-architect.css, 21-climb.css, 22-viz-generic.css.

BASELINE (already verified green — trust, don't re-run): tsc clean; next lint 0 warnings;
vitest 58/58; next build OK (209 pages). Every learner string is I18nText {en,es}.

You are an ADVERSARIAL reviewer. Actually OPEN and READ the cited files. Every blocker MUST be
real, specific, independently checkable (cite file:line + the exact defect). Nitpicks that don't
block a credible public launch are NOT blockers — report as notes, verdict PASS. Do NOT use the
Skill tool or any web tool (they derail on Claude/model mentions). Read files directly.
`

const DIMENSIONS = [
  {
    key: 'progression',
    label: 'progression-ux',
    prompt: `${CONTEXT}

YOUR DIMENSION: PROGRESSION CLARITY & CORRECTNESS (the user's core ask: "the order didn't make
sense; make level→level progression clear, show what it takes to level up, add a framing scenario").
- Read src/lib/climb.ts + tests/climb.test.ts + ClimbView.tsx + LearnShell.tsx. Verify the gating
  LOGIC is correct and honest: L3 open; ascend only at quorum; locked stages truly locked; status
  (complete/current/locked) computed right; nextAction sane. Any off-by-one / wrong-gate is a BLOCKER.
- Verify the experience actually ANSWERS "what do I do next and what unlocks the next level?" — the
  you-are-here header, the "clear N of 6 to ascend" gate bar, the role mandate per level. Is the
  climb genuinely the default, with browse-by-domain still reachable?
- Verify LEVEL_MANDATE copy is real, correct, bilingual, non-generic.
- Flag if the Climb and the old CurriculumView/path now contradict each other confusingly.`,
  },
  {
    key: 'builder',
    label: 'architecture-builder',
    prompt: `${CONTEXT}

YOUR DIMENSION: THE ARCHITECTURE BUILDER (constructive "build it, don't pick it" check + a11y).
- Read src/lib/build.ts + tests/build.test.ts + ArchitectBuilder.tsx + builds.json + its wiring in
  CheckpointPlayer.tsx + BuildGallery.tsx + /build route.
- GRADER CORRECTNESS: is gradeBuild sound? required nodes (min counts), required DIRECTED edges by
  type, forbidden edges absent, correct == all criteria pass. Find any case where a wrong build
  grades correct or a right build grades wrong. Check builds.json for contradictory rules (an edge
  both required and forbidden), unreachable-required edges, or wrong reference architectures
  (technically incorrect topology / anti-pattern mislabeled). Spot-check ≥3 challenges for technical
  correctness (e.g. RAG path, read-replicas one-way replication, strangler façade).
- A11Y: confirm tap-to-place works WITHOUT drag (WCAG 2.5.7), keyboard operable (Enter/Space/Delete),
  40px+ targets, aria labels/live region. Drag must be enhancement only. A drag-only path is a BLOCKER.`,
  },
  {
    key: 'widgets',
    label: 'widgets-content',
    prompt: `${CONTEXT}

YOUR DIMENSION: WIDGETS & CONTENT QUALITY (no AI-slop; genuine fit; correct bilingual params).
- Read the 3 new widgets (SpectrumSlider/DecisionFlow/TradeoffCurve), viz/index.ts, the registry
  test, and SAMPLE ~10 of the 59 new concept.visual mappings in src/content/data/lessons.json.
- SLOP CHECK (contract bar 4): is each widget mapping a GENUINE fit for that concept, with authored,
  technically-correct, specific params — NOT keyword-coincidence filler? Flag any mapping whose params
  are generic/wrong/misleading, or where the widget doesn't actually teach that concept. A few bad
  forced mappings = BLOCKER (name them).
- DecisionFlow params integrity: every non-verdict node has q+yes+no pointing at REAL node ids; at
  least one verdict reachable; no dangling edges. Spectrum: 2-4 real dimensions. Verify a sample.
- ES authored not MT (no calques librería/robusto/correctitud; correct tildes/¿¡ñ) in the new params.
- Determinism: widgets must not use Math.random/Date.now at render (grep them).`,
  },
  {
    key: 'integrity',
    label: 'integrity-deploy',
    prompt: `${CONTEXT}

YOUR DIMENSION: TECHNICAL INTEGRITY, A11Y/THEMES & DEPLOY-READINESS of the changed surface.
- "use client" on every new component using hooks/events (ClimbView, LearnShell, ArchitectBuilder,
  BuildGallery, the 3 widgets). Determinism (no render-time Math.random/Date.now). SSR-safe
  (localStorage/window guarded).
- Both THEMES (Studio + Pixel) and both LOCALES: do the new styles (20/21/22) use TOKENS not hardcoded
  hex, and include pixel-theme square/zero-radius overrides? New chrome strings inline {en,es} (NOT
  edited into shared messages.ts/config.ts per contract)? Nav "Build Lab" added correctly.
- WCAG AA: tap targets ≥40px on new controls; visible focus; the learn-mode toggle uses aria-selected
  (not aria-pressed on role=tab). Motion transform/opacity + reduced-motion safe; content visible by
  default (no opacity:0 default).
- DEPLOY: new /build route builds to out/ for EN+ES; no hardcoded host/localhost; lessons.json still
  valid JSON and not bloated beyond reason. next.config export settings intact.
- Confirm the merge tool (deploy/merge-widgets.cjs) validation is sound (can't inject a bad widgetId).`,
  },
]

const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['verdict', 'blockers', 'notes'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    blockers: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['summary', 'file', 'detail', 'fix'],
      properties: {
        summary: { type: 'string' }, file: { type: 'string' },
        detail: { type: 'string' }, fix: { type: 'string' },
      },
    }},
    notes: { type: 'array', items: { type: 'string' } },
  },
}
const CONFIRM_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['isReal', 'reason'],
  properties: { isReal: { type: 'boolean' }, reason: { type: 'string' } },
}

let round = 0
const maxRounds = 3
const history = []

while (round < maxRounds) {
  round++
  phase('Audit')
  log(`Round ${round}: 4 adversarial reviewers auditing the experience overhaul…`)
  const audits = await parallel(DIMENSIONS.map((d) => () =>
    agent(d.prompt, { label: `audit:${d.label} r${round}`, phase: 'Audit', schema: VERDICT_SCHEMA, effort: 'high' })
  ))
  const results = DIMENSIONS.map((d, i) => ({ dim: d.key, result: audits[i] })).filter((r) => r.result)

  const raw = results.flatMap((r) => (r.result.blockers || []).map((b) => ({ ...b, dim: r.dim })))
  let confirmed = []
  if (raw.length) {
    phase('Reverify')
    log(`Verifying ${raw.length} raised blocker(s)…`)
    const verdicts = await parallel(raw.map((b) => () =>
      agent(
        `${CONTEXT}\n\nA reviewer raised this as a BLOCKER (${b.dim}):\nSUMMARY: ${b.summary}\nFILE: ${b.file}\n` +
        `DETAIL: ${b.detail}\nPROPOSED FIX: ${b.fix}\n\nOpen the cited file(s) and independently verify. Is this a REAL, ` +
        `launch-blocking defect? Default isReal=false if it's a nitpick, subjective, already handled, or not actually present. ` +
        `Do NOT use the Skill tool or any web tool.`,
        { label: `verify:${b.dim} r${round}`, phase: 'Reverify', schema: CONFIRM_SCHEMA }
      ).then((v) => ({ ...b, verify: v }))
    ))
    confirmed = verdicts.filter(Boolean).filter((b) => b.verify?.isReal)
  }

  const allPass = results.length === DIMENSIONS.length && results.every((r) => r.result.verdict === 'PASS') && confirmed.length === 0
  history.push({
    round,
    verdicts: results.map((r) => ({ dim: r.dim, verdict: r.result.verdict })),
    confirmed: confirmed.length,
    notes: results.flatMap((r) => (r.result.notes || []).map((n) => `[${r.dim}] ${n}`)),
  })

  if (allPass) { log(`Round ${round}: ALL 4 PASS, 0 confirmed blockers. GREEN.`); return { status: 'PASS', rounds: round, history } }
  if (confirmed.length === 0) {
    log(`Round ${round}: no confirmed blockers survived verification.`)
    return { status: 'PASS_NO_CONFIRMED_BLOCKERS', rounds: round, history, unverified: results.filter((r) => r.result.verdict === 'FAIL').map((r) => r.dim) }
  }

  phase('Fix')
  log(`Round ${round}: ${confirmed.length} confirmed blocker(s). Fixing sequentially…`)
  const list = confirmed.map((b, i) => `${i + 1}. [${b.dim}] ${b.summary}\n   FILE: ${b.file}\n   PROBLEM: ${b.detail}\n   FIX: ${b.fix}`).join('\n\n')
  const fixReport = await agent(
    `${CONTEXT}\n\nYou are the FIXER. Apply MINIMAL, surgical fixes for these CONFIRMED blockers in ${ROOT}. ` +
    `Respect the HARD BARS. If a fix touches lessons.json widget params, edit precisely (it's a big file — use targeted edits). ` +
    `After editing run: cd ${ROOT} && npx tsc --noEmit && npx next lint --dir src && npx vitest run — fix anything you broke. ` +
    `Do NOT run next build or deploy. Do NOT use the Skill tool or any web tool.\n\nBLOCKERS:\n\n${list}\n\n` +
    `Report exactly which files you changed and the tsc/lint/vitest results.`,
    { label: `fix r${round}`, phase: 'Fix', effort: 'high' }
  )
  history[history.length - 1].fixReport = fixReport
}

return { status: 'MAX_ROUNDS_REACHED', rounds: round, history }
