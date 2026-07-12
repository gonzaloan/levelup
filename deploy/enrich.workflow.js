export const meta = {
  name: 'levelup-widget-enrich',
  description: 'Propose interactive-widget mappings for concepts that lack one (genuine fits only), per domain',
  phases: [{ title: 'Propose' }],
}

const ROOT = 'C:/Projects/personal/level-up'
const DOMAINS = [
  'technical-depth', 'systems-architecture', 'execution-delivery',
  'direction-influence', 'leveling-scope', 'ai-engineering',
]

const WIDGET_GUIDE = `
AVAILABLE INTERACTIVE WIDGETS you may map (widgetId → what it teaches → the params it needs):

PARAMETERIZED (author-driven — PREFER these; they teach ONLY what you write in params):
1. "spectrum" — an "X vs Y" tradeoff you slide between (monolith↔microservices, strong↔eventual,
   sync↔async, prompt↔fine-tune, centralize↔decentralize…). params:
   { "leftPole":{en,es}, "rightPole":{en,es},
     "dimensions":[ {"label":{en,es},"left":{en,es},"right":{en,es}} , ...2-4 ],
     "leftNote":{en,es}, "rightNote":{en,es} }
2. "decision-flow" — a small yes/no decision tree ending in verdicts ("when do I introduce a queue?",
   "which consistency model?", "should this be a microservice?", "workflow vs agent?"). params:
   { "start":"a",
     "nodes": { "a": {"q":{en,es},"yes":"b","no":"c"},
                "b": {"verdict":{en,es}}, "c": {"verdict":{en,es}} , ... } }
   Rules: every non-verdict node has q + yes + no pointing at real node ids; leaf nodes have verdict only;
   2-4 questions, 2-4 verdicts; no cycles.
3. "tradeoff-curve" — a "sweet spot / diminishing returns / U-shaped cost" curve you drag along
   (chunk size, batch size, redundancy vs cost, over- vs under-indexing, test coverage ROI…). params:
   { "xAxis":{en,es}, "yAxis":{en,es}, "shape":"u"|"diminishing"|"linear-up", "sweetSpot":55,
     "lowNote":{en,es}, "highNote":{en,es}, "sweetNote":{en,es} }

SIGNATURE (fixed — map ONLY if the concept is essentially this exact topic; they take NO params):
"big-o" (algorithmic complexity growth), "sort-race" (comparing sort algorithms),
"consistency" (CAP / consistency levels), "rag-pipeline" (RAG retrieval stages),
"consensus" (quorum/consensus rounds), "latency-budget" (tail latency & fan-out),
"token-economics" (LLM cost per task), "threat-board" (threat modeling / LLM security),
"scaling-curves" (horizontal vs vertical scaling), "eval-harness" (evals as engineering).

HARD RULES:
- Map a widget to a concept ONLY when it genuinely teaches THAT concept. A loose keyword match is NOT
  enough — if nothing fits, leave the concept out. Quality over coverage. Better 6 great maps than 20 forced.
- ES must be authored, not machine-translated: correct ¿¡ñ + tildes, no calques (biblioteca not librería,
  confiable/fiable not robusto, compromiso for tradeoff). Every string is {en,es}.
- Widget content must be TECHNICALLY CORRECT and specific to the concept — real dimensions, real verdicts.
- Do NOT use the Skill tool or any web tool (they derail on model/Claude mentions). Read files directly.
`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['mappings'],
  properties: {
    mappings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        required: ['slug', 'widgetId', 'params', 'rationale'],
        properties: {
          slug: { type: 'string' },
          widgetId: { type: 'string' },
          params: { type: 'object' },
          rationale: { type: 'string', description: 'why this widget genuinely teaches this concept' },
        },
      },
    },
  },
}

const results = await parallel(
  DOMAINS.map((dom) => () =>
    agent(
      `${WIDGET_GUIDE}\n\nYou are enriching the "${dom}" domain of level-up. Read the concept list at\n` +
        `${ROOT}/research/widget-map/${dom}.json — each entry has slug, level, title, why, and an explanation excerpt.\n` +
        `For the concepts where an interactive widget GENUINELY helps understanding, produce a mapping with a\n` +
        `fully-authored, technically-correct, bilingual params object per the widget's schema above.\n` +
        `Aim for QUALITY: map maybe 40-70% of concepts — only the ones that truly fit. Prefer the 3 parameterized\n` +
        `widgets. Return the mappings via the structured output. slug must match exactly.`,
      { label: `enrich:${dom}`, phase: 'Propose', schema: SCHEMA, effort: 'high' }
    ).then((r) => ({ dom, mappings: (r && r.mappings) || [] }))
  )
)

const all = results.filter(Boolean).flatMap((r) => r.mappings.map((m) => ({ ...m, dom: r.dom })))
log(`Collected ${all.length} widget mappings across ${results.length} domains`)
return { total: all.length, byDomain: results.map((r) => ({ dom: r.dom, n: r.mappings.length })), mappings: all }
