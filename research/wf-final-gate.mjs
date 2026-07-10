export const meta = {
  name: 'levelup-final-gate',
  description: 'Adversarial final-gate: 3 PASS/FAIL validators judge the integrated platform against the "definitive, better-than-get-certified" bar; fix loop until all PASS',
  phases: [
    { title: 'Judge', detail: '3 adversarial PASS/FAIL lenses on the whole platform' },
    { title: 'Fix', detail: 'per-area fixes until all PASS' },
  ],
}

const ROOT = 'C:\\\\Projects\\\\Personal\\\\level-up'

const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['verdict', 'blockers', 'notes'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    blockers: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['file', 'issue', 'fix'],
      properties: { file: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } },
    } },
    notes: { type: 'string' },
  },
}

const BASE = `Working dir: ${ROOT} (cd there). READ-ONLY. This platform (level-up, Next.js static export) just received a big polish+content iteration to match/exceed its sibling get-certified (C:\\Projects\\Personal\\get-certified). tsc/lint/build/40-tests are already green — do NOT re-litigate those. Judge the QUALITY BAR: is this "the definitive platform"? Be adversarial and specific. Return FAIL with concrete blockers (file + issue + exact fix) for anything that falls short; PASS only if genuinely excellent. Inspect real source/content files.`

const LENSES = [
  { key: 'content-quality', prompt: `${BASE}

LENS: CONTENT QUALITY & BILINGUAL INTEGRITY. The enrichment just added flashcards (152 concepts), children sub-cards (152), mnemonics (115), cheat sheets (30 lessons) to src/content/data/lessons.json — all bilingual {en,es}. Sample ~8 concepts across DIFFERENT domains/levels (technical-depth, ai-engineering, direction-influence, leveling-scope) and audit:
- Are flashcards genuine active-recall (a question forcing retrieval + a crisp correct answer), not trivia restatement?
- Are children real distinct sub-facets (not duplicates of keyPoints)?
- Are mnemonics actual memory hooks (not filler)?
- Do cheat sheets capture the must-know thresholds/heuristics for the level?
- Spanish: authored quality? correct ¿¡ñ + tildes, technical idiom (recuperador/compensación/confiable), NO machine-translation calques or English left untranslated? Flag any concept where EN and ES diverge in meaning, any empty/placeholder text, any factual error.
Use: node -e "const d=require('./src/content/data/lessons.json');const l=d.lessons.find(x=>x.lessonId==='ai-engineering-l5');console.log(JSON.stringify(l.concepts[0],null,1))" (vary lessonId/index). FAIL if quality is uneven or any Spanish is machine-translated/wrong.`,
  },
  { key: 'parity-superiority', prompt: `${BASE}

LENS: PARITY & SUPERIORITY vs get-certified. get-certified's signature strengths were: animated staged flow diagrams, hover/focus code tooltips, figure-zoom lightbox, named XP rank ladder, flashcards, cheat sheets, timed exam, a signature mode-switch pill, and a polished pixel skin. Verify level-up now MATCHES or EXCEEDS each — read the actual implementations (src/components/lesson/CodeView.tsx, FigureZoom.tsx, Schematic.tsx + 18-schematic-anim.css, RankLadder.tsx + lib/ranks.ts, FlashcardDeck.tsx, CheatSheet.tsx, ExamRunner.tsx, ThemeToggle.tsx, 05-pixel-theme.css). For EACH: is it real and complete, or shallow vs get-certified's version (study get-certified/src/{code-view,figure-zoom,diagram-fx,mode-switch}.js)? Also confirm level-up KEEPS its own advantages (bilingual, 152 concepts, adaptive assess, novel checks, gauntlet) — flag any regression. FAIL if any feature is meaningfully weaker than get-certified's or a level-up strength regressed.`,
  },
  { key: 'ux-cohesion', prompt: `${BASE}

LENS: VISUAL COHESION & UX POLISH. Judge whether the whole reads as ONE definitive, premium product (get-certified's bar). Read the CSS modules (01-tokens..19) and the landing (src/app/[locale]/page.tsx), Nav.tsx, LessonView.tsx, MeView.tsx. Check:
- Consistent use of design tokens (no off-palette hardcoded colors that duplicate a token); both studio + pixel themes coherent.
- The new CSS modules (13-19) match the observatory/instrument language of the originals (not visually foreign).
- SD hero/world/emblem art is wired gracefully (page.tsx references /hero, /worlds, /brand) with fallbacks, and reads as premium not slop.
- Motion: transform/opacity only, reduced-motion gated, content visible by default (grep new CSS for un-armed opacity:0 defaults).
- Reader flow (overview→concept→recall→check→practice→done) is cohesive; the enriched blocks (sub-cards, mnemonic, flashcards, cheat sheet) are styled consistently, not bolted on.
FAIL for any visual inconsistency, foreign-looking module, ungraceful art wiring, or hard-bar motion violation, with the exact file + fix.`,
  },
]

async function judge(round) {
  return parallel(LENSES.map(l => () =>
    agent(l.prompt, { label: `judge:${l.key}-r${round}`, phase: 'Judge', schema: VERDICT_SCHEMA, agentType: 'Explore' })
      .then(r => ({ key: l.key, ...(r || { verdict: 'FAIL', blockers: [], notes: 'null result' }) }))
  ))
}

let round = 0
const MAX = 2
let verdicts = []
let allPass = false
while (round <= MAX) {
  phase('Judge')
  log(`Final-gate judging round ${round}`)
  verdicts = await judge(round)
  const fails = verdicts.filter(Boolean).filter(v => v.verdict !== 'PASS')
  const passes = verdicts.filter(Boolean).filter(v => v.verdict === 'PASS').map(v => v.key)
  log(`PASS: [${passes.join(', ')}]  FAIL: [${fails.map(f => f.key).join(', ')}]`)
  if (fails.length === 0) { allPass = true; break }
  if (round === MAX) break
  round++
  phase('Fix')
  const blockers = fails.flatMap(f => (f.blockers || []).map(b => ({ ...b, lens: f.key })))
  log(`Fixing ${blockers.length} blockers`)
  // A small number of serial fix agents (content vs code) to avoid file races.
  const contentB = blockers.filter(b => /lessons\.json|content\//.test(b.file))
  const codeB = blockers.filter(b => !/lessons\.json|content\//.test(b.file))
  const jobs = []
  if (contentB.length) jobs.push(() => agent(
    `Working dir: ${ROOT}. Fix these CONTENT blockers in src/content/data/lessons.json. Every string stays bilingual {en,es} with AUTHORED Spanish (no machine translation). Do not break JSON. After editing, run: node -e "JSON.parse(require('fs').readFileSync('src/content/data/lessons.json','utf8'));console.log('ok')" and npx tsc --noEmit. Blockers:\n` +
    contentB.map(b => `- ${b.file}: ${b.issue} → FIX: ${b.fix}`).join('\n'),
    { label: `fix:content-r${round}`, phase: 'Fix', agentType: 'general-purpose' }))
  if (codeB.length) jobs.push(() => agent(
    `Working dir: ${ROOT}. Read docs/DEFINITIVE-BUILD-CONTRACT.md. Fix these CODE/CSS blockers with minimal in-style edits; keep both studio+pixel themes; motion transform/opacity + reduced-motion gated + visible-by-default; every UI string bilingual via m()/t(). After editing run npx tsc --noEmit + npx next lint --dir src clean. Blockers:\n` +
    codeB.map(b => `- ${b.file}: ${b.issue} → FIX: ${b.fix}`).join('\n'),
    { label: `fix:code-r${round}`, phase: 'Fix', agentType: 'general-purpose' }))
  await parallel(jobs)
}

return {
  allPass,
  rounds: round,
  verdicts: verdicts.map(v => ({ lens: v.key, verdict: v.verdict, openBlockers: (v.blockers || []).length, notes: v.notes })),
}
