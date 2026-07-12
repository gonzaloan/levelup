export const meta = {
  name: 'levelup-ship-gate',
  description: 'Review level-up with 4 adversarial reviewers; fix blockers; loop until all PASS for deploy to levelup.skillrealm.dev',
  phases: [
    { title: 'Audit' },
    { title: 'Fix' },
    { title: 'Reverify' },
  ],
}

const ROOT = 'C:/Projects/personal/level-up'

const CONTEXT = `
PROJECT: level-up — a Next.js 15 static-export ("output: export") bilingual (EN/ES)
gamified learning platform to take engineers Junior→Principal. Working copy: ${ROOT}.
Branch definitive-platform-iteration, working tree clean. Sibling of get-certified
(C:/Projects/personal/get-certified). It is at "enhancement cycle 8": 152/152 concepts
enriched, 290 checks, 30 lessons, badges + boss art present, adaptive assessment engine,
red-team "Gauntlet", novel check mechanics, two themes (Studio + Pixel), 6-axis radar.

CURRENT BASELINE (already verified green by the orchestrator — do NOT re-run these,
trust them): npx tsc --noEmit = clean; npx next lint --dir src = 0 warnings;
npx vitest run = 40/40 pass; npx next build = success, 207 static HTML pages in out/.

DEPLOY TARGET: levelup.skillrealm.dev — private S3 bucket + CloudFront (OAC) + ACM,
serving the static ${ROOT}/out tree. NO backend, NO server: progress is localStorage-only.
Same secure static pattern as skillrealm-hub. CloudFront serves from root (no basePath).

The build contract with the HARD BARS is at ${ROOT}/docs/DEFINITIVE-BUILD-CONTRACT.md
— READ IT FIRST. This is a FINAL pre-deploy gate: the bar is "this is the definitive,
most complete version, ready to be the public face at levelup.skillrealm.dev".

You are an ADVERSARIAL reviewer. Actually open and read files under ${ROOT}/src,
${ROOT}/public, ${ROOT}/out, ${ROOT}/deploy. Do not rubber-stamp. But every blocker
you raise MUST be real, specific, and independently checkable (cite file:line and the
exact problem) — no vague "could be better" or speculative concerns. Nitpicks that do
not block a credible public launch are NOT blockers (report them as notes, verdict PASS).
`

const DIMENSIONS = [
  {
    key: 'content',
    label: 'content-completeness',
    prompt: `${CONTEXT}

YOUR DIMENSION: CONTENT COMPLETENESS & CORRECTNESS.
Verify the LEARNING content is genuinely complete and publication-grade:
- Inspect ${ROOT}/src/content/data/*.json (curriculum.json, lessons.json, checks.json,
  ai-l5.json, general-l5.json). Confirm 152 concepts really are enriched (not stubs),
  30 lessons are full, checks exist and their answer keys are in-range and correct.
- Grep the whole content + src tree for placeholders that must NOT ship: "TODO", "FIXME",
  "lorem", "ipsum", "PLACEHOLDER", "TBD", "coming soon", "XXX", empty strings where prose
  is expected, obviously duplicated/templated concept bodies, {en:"",es:""}.
- Spot-check factual correctness of a sample of technical claims (Big-O, consistency,
  RAG/agents, OWASP LLM, leveling) — flag anything wrong.
- Confirm badges (public/badges) and boss art (public/bosses) referenced by src/lib
  actually exist as files.
Do NOT use the Skill tool or any web tool. Read files directly.`,
  },
  {
    key: 'design',
    label: 'design-ux',
    prompt: `${CONTEXT}

YOUR DIMENSION: DESIGN, VISUAL IDENTITY & UX.
- Confirm it matches/exceeds get-certified's identity and has NO AI-slop (per contract
  bar 4): hand-authored SVG/CSS diagrams, decorative raster only for boss/hero/badge.
- Read src/app/styles/*.css + key components. Check WCAG AA contrast intent, visible
  focus, tap targets >=40px, tap-to-place (not drag) checks, reduced-motion double-gating,
  content-visible-by-default (never opacity:0 default).
- Both themes (Studio + Pixel) coherent EN/ES. Landing, lesson (3-col), path, gauntlet,
  /me trophy room, radar all present and not broken/empty.
- Look at the built out/ HTML for any obviously broken layout markers or missing assets.
Do NOT use the Skill tool or any web tool. Read files directly.`,
  },
  {
    key: 'technical',
    label: 'technical-i18n',
    prompt: `${CONTEXT}

YOUR DIMENSION: TECHNICAL SOUNDNESS & BILINGUAL QUALITY.
- Bilingual: every learner-facing/UI string is I18nText {en,es} rendered via t(); ES is
  AUTHORED not machine-translated (correct ¿¡ñ + tildes; NO calques like "librería" for
  library, "robusto" for robust, "correctitud"). Sample lessons.json / components for ES quality.
- Determinism: no Math.random()/Date.now() at render time (grep src for them; seeded use
  in tools/tests is fine). "use client" on components using hooks/effects/events.
- Routing: static export correctness — all /[locale]/... routes generate; no dynamic
  server-only APIs; images unoptimized. localStorage access guarded for SSR (typeof window).
- No broken imports, no console.error on load paths you can reason about.
Do NOT use the Skill tool or any web tool (they derail on Claude/model mentions). Read files directly.`,
  },
  {
    key: 'deploy',
    label: 'deploy-readiness',
    prompt: `${CONTEXT}

YOUR DIMENSION: PRODUCTION / DEPLOY READINESS for levelup.skillrealm.dev (static S3+CloudFront).
- Asset & link correctness under a bare CloudFront root: check that public/ assets are
  referenced with root-relative or Next-managed paths that resolve when served from the
  domain root (no hardcoded localhost:3000, no absolute file paths, no wrong basePath).
- OG / share / canonical URLs: grep src + out for hardcoded hosts. Anything pointing at
  localhost, gonzalo-munoz.com, certs.skillrealm.dev, or a placeholder domain that should
  be levelup.skillrealm.dev is a BLOCKER. Confirm og:image / share URLs resolve.
- Confirm next.config.mjs output:"export" + trailingSlash + images.unoptimized are set so
  the out/ tree is CloudFront-servable (trailingSlash => /path/ => needs index.html; verify
  out/ has directory index.html files, and consider the CloudFront default-root/404 behavior).
- Confirm out/ actually contains the pages, _next chunks, badges, bosses, og assets.
- Flag any secret/key committed, any .env leakage, any dev-only artifact that would ship.
Do NOT use the Skill tool or any web tool. Read files directly.`,
  },
]

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'blockers', 'notes'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    blockers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'file', 'detail', 'fix'],
        properties: {
          summary: { type: 'string' },
          file: { type: 'string', description: 'file:line or path' },
          detail: { type: 'string', description: 'exact problem, independently checkable' },
          fix: { type: 'string', description: 'concrete fix instruction' },
        },
      },
    },
    notes: { type: 'array', items: { type: 'string' }, description: 'non-blocking observations' },
  },
}

const CONFIRM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isReal', 'reason'],
  properties: {
    isReal: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

let round = 0
const maxRounds = 4
let history = []

while (round < maxRounds) {
  round++
  phase('Audit')
  log(`Round ${round}: 4 adversarial reviewers auditing…`)

  const audits = await parallel(
    DIMENSIONS.map((d) => () =>
      agent(d.prompt, { label: `audit:${d.label} r${round}`, phase: 'Audit', schema: VERDICT_SCHEMA })
    )
  )

  const results = DIMENSIONS.map((d, i) => ({ dim: d.key, label: d.label, result: audits[i] }))
  const dead = results.filter((r) => !r.result)
  if (dead.length) log(`WARN: ${dead.length} reviewer(s) returned null this round`)

  // Adversarially verify each raised blocker before acting on it — kill speculation.
  const rawBlockers = results
    .filter((r) => r.result)
    .flatMap((r) => (r.result.blockers || []).map((b) => ({ ...b, dim: r.dim })))

  let confirmed = []
  if (rawBlockers.length) {
    phase('Reverify')
    log(`Verifying ${rawBlockers.length} raised blocker(s)…`)
    const verdicts = await parallel(
      rawBlockers.map((b) => () =>
        agent(
          `${CONTEXT}\n\nA reviewer raised this as a BLOCKER for the ${b.dim} dimension:\n` +
            `SUMMARY: ${b.summary}\nFILE: ${b.file}\nDETAIL: ${b.detail}\nPROPOSED FIX: ${b.fix}\n\n` +
            `Open the cited file(s) and independently verify. Is this a REAL, deploy-blocking defect ` +
            `(would break the public launch or ship broken/incomplete/wrong content)? Default isReal=false ` +
            `if it is a nitpick, subjective, already handled elsewhere, or not actually present in the code. ` +
            `Do NOT use the Skill tool or any web tool.`,
          { label: `verify:${b.dim} r${round}`, phase: 'Reverify', schema: CONFIRM_SCHEMA }
        ).then((v) => ({ ...b, verify: v }))
      )
    )
    confirmed = verdicts.filter(Boolean).filter((b) => b.verify?.isReal)
  }

  const allPass =
    results.length === DIMENSIONS.length &&
    results.every((r) => r.result && r.result.verdict === 'PASS') &&
    confirmed.length === 0

  history.push({
    round,
    verdicts: results.map((r) => ({ dim: r.dim, verdict: r.result?.verdict ?? 'NULL' })),
    confirmedBlockers: confirmed.length,
    notes: results.filter((r) => r.result).flatMap((r) => (r.result.notes || []).map((n) => `[${r.dim}] ${n}`)),
  })

  if (allPass) {
    log(`Round ${round}: ALL 4 PASS, 0 confirmed blockers. Gate GREEN.`)
    return { status: 'PASS', rounds: round, history }
  }

  if (confirmed.length === 0) {
    // No confirmed blockers but some reviewer said FAIL without a verifiable blocker — treat as pass-worthy but report.
    log(`Round ${round}: no confirmed blockers survived verification, but not all reviewers returned PASS. Reporting for orchestrator judgment.`)
    return { status: 'PASS_NO_CONFIRMED_BLOCKERS', rounds: round, history, unverifiedFailures: results.filter(r => r.result?.verdict === 'FAIL').map(r => r.dim) }
  }

  // FIX PHASE — sequential single fixer to avoid parallel edits clobbering the shared tree.
  phase('Fix')
  log(`Round ${round}: ${confirmed.length} confirmed blocker(s). Applying fixes sequentially…`)
  const blockerList = confirmed
    .map((b, i) => `${i + 1}. [${b.dim}] ${b.summary}\n   FILE: ${b.file}\n   PROBLEM: ${b.detail}\n   FIX: ${b.fix}`)
    .join('\n\n')

  const fixReport = await agent(
    `${CONTEXT}\n\nYou are the FIXER. Apply MINIMAL, surgical fixes for these CONFIRMED deploy-blockers ` +
      `in ${ROOT}. Respect the build contract HARD BARS and files-you-must-not-carelessly-break list. ` +
      `Keep house style. After editing, run: cd ${ROOT} && npx tsc --noEmit && npx next lint --dir src && npx vitest run ` +
      `— and fix anything you broke. Do NOT run next build (the orchestrator will). Do NOT deploy. ` +
      `Do NOT use the Skill tool or any web tool.\n\nBLOCKERS:\n\n${blockerList}\n\n` +
      `Report exactly which files you changed and the result of tsc/lint/vitest.`,
    { label: `fix r${round}`, phase: 'Fix', effort: 'high' }
  )
  history[history.length - 1].fixReport = fixReport
  log(`Round ${round}: fixes applied. Re-auditing next round.`)
}

return { status: 'MAX_ROUNDS_REACHED', rounds: round, history }
