export const meta = {
  name: 'levelup-content-enrich',
  description: 'Author flashcards + sub-cards + mnemonics per concept and a cheat sheet per lesson, one agent per lesson, each writing a validated patch file; then verify bilingual quality',
  phases: [
    { title: 'Author', detail: 'one agent per lesson → writes enrich patch JSON' },
    { title: 'Review', detail: 'bilingual + pedagogy PASS/FAIL per patch' },
  ],
}

const ROOT = 'C:\\\\Projects\\\\Personal\\\\level-up'

// args = array of { lessonId, track, conceptSlugs: string[], level, domainId } for each lesson to enrich.
// The orchestrator fills this from lessons.json before running.
const LESSONS = Array.isArray(args) ? args : []

const RULES = `Working dir: ${ROOT}. You author bilingual (EN + authored Spanish, NEVER machine-translated) learning enrichment for level-up, a guide from Senior→Staff/Principal engineer. Spanish must be correct and idiomatic (¿¡ñ + tildes; "compensación" for tradeoff, "confiable" not "robusto"; no calques). Do NOT edit any code or the lessons.json file. You ONLY write ONE patch JSON file. Do NOT use Skill/WebFetch/WebSearch. Keep content accurate, concrete, senior-level — no fluff, no hallucinated APIs.`

const PATCH_SCHEMA_DOC = `The patch file is a JSON object of EXACTLY this shape (all strings are {"en","es"} objects):
{
  "lessonId": "<the lesson id>",
  "cheatSheet": [
    { "heading": {"en","es"}, "rows": [ { "term": {"en","es"}, "note": {"en","es"} }, ... 4-8 rows ] },
    ... 2-4 sections covering the whole lesson's must-know facts, formulas, thresholds, heuristics ...
  ],
  "concepts": {
    "<concept-slug>": {
      "flashcards": [ { "front": {"en","es"}, "back": {"en","es"} }, ... 2-3 per concept, active-recall Q→A ],
      "children": [ { "label": {"en","es"}, "detail": {"en","es"} }, ... 2-4 scannable sub-facets of the concept ],
      "mnemonic": {"en","es"}   // a short memory hook; omit if none is genuinely useful
    },
    ... one entry PER concept slug given ...
  }
}
No other keys. Bilingual on every string. Valid JSON, UTF-8.`

phase('Author')
const patches = await parallel(LESSONS.map((L) => () => {
  const outPath = `research/enrich-patches/${L.lessonId}.json`
  const conceptList = L.conceptSlugs.map(s => `"${s}"`).join(', ')
  const prompt = `${RULES}

TASK: Enrich lesson "${L.lessonId}" (track: ${L.track}, level ${L.level}, domain ${L.domainId}).
This lesson has these concept slugs (enrich EVERY one): [${conceptList}].

FIRST read the lesson's existing content to ground your enrichment accurately: open src/content/data/lessons.json and locate the lesson object with lessonId === "${L.lessonId}" (it is large — you may grep for the lessonId and read that region, or use node to extract it: \`node -e "const d=require('./src/content/data/lessons.json');const l=d.lessons.find(x=>x.lessonId==='${L.lessonId}');console.log(JSON.stringify(l.concepts.map(c=>({slug:c.slug,explanation:c.explanation.en,keyPoints:c.keyPoints.map(k=>k.en)})),null,1))"\`). Base your flashcards/children/mnemonics on the ACTUAL concept content, not guesses.

Then author enrichment. ${PATCH_SCHEMA_DOC}

Quality bar:
- flashcards: genuine active-recall (a question that forces retrieval, a crisp answer). 2-3 per concept.
- children: break the concept into 2-4 concrete sub-facets a Staff engineer must distinguish — each label short, each detail one tight sentence.
- mnemonic: only when a real hook exists (acronym, vivid image); otherwise omit the key.
- cheatSheet: the one-page revision sheet for this whole lesson — the exact thresholds, definitions, decision heuristics, and tradeoffs worth memorizing. 2-4 sections.

Write the completed JSON to ${outPath} (create it). Then verify it parses: \`node -e "JSON.parse(require('fs').readFileSync('${outPath}','utf8')); console.log('ok')"\`. Report the path and the ok/parse result.`
  return agent(prompt, { label: `author:${L.lessonId}`, phase: 'Author', agentType: 'general-purpose' })
    .then(r => ({ lessonId: L.lessonId, outPath, report: r }))
}))

const done = patches.filter(Boolean)
log(`Author phase done: ${done.length}/${LESSONS.length} lessons produced patch files`)

return {
  authored: done.map(d => ({ lessonId: d.lessonId, outPath: d.outPath })),
  total: LESSONS.length,
  note: 'Run research/merge-enrichment.mjs --check then without --check to validate+merge deterministically.',
}
