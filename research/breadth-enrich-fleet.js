export const meta = {
  name: 'levelup-breadth-enrich',
  description: 'Enrich the 20 non-flagship lessons (~97 concepts) to the same definitive-guide bar as the flagship: depth/keywords/code/example/architecture/interactive-widget/pitfalls/analogy, fact-checked and de-slopped, bilingual EN/ES.',
  phases: [{ title: 'Enrich' }, { title: 'Repair' }],
};

// args = array of lessonId strings
const ids = Array.isArray(args) ? args : [];
if (!ids.length) return { error: 'no lesson ids' };

const WIDGETS = ['big-o', 'sort-race', 'consistency', 'rag-pipeline', 'consensus', 'latency-budget', 'token-economics', 'threat-board', 'scaling-curves', 'eval-harness'];
const WIDGET_USES = 'big-o=complexity growth; sort-race=n^2 sorting; consistency=CAP/PACELC tradeoff; rag-pipeline=RAG stages; consensus=quorum/leader election; latency-budget=p99/fan-out; token-economics=LLM cost per request; threat-board=STRIDE/OWASP security; scaling-curves=Amdahl/scaling limits; eval-harness=eval sets/CI/LLM-judge.';

const I18N = { type: 'object', required: ['en', 'es'], additionalProperties: false, properties: { en: { type: 'string' }, es: { type: 'string' } } };
const SCHEMATIC = { type: 'object', required: ['kind', 'caption'], additionalProperties: false, properties: {
  kind: { type: 'string', enum: ['flow', 'stack', 'compare', 'axes'] }, caption: I18N,
  nodes: { type: 'array', items: { type: 'object', required: ['label'], additionalProperties: false, properties: { label: I18N, note: I18N } } },
  left: { type: 'object', required: ['title', 'points'], additionalProperties: false, properties: { title: I18N, points: { type: 'array', items: I18N } } },
  right: { type: 'object', required: ['title', 'points'], additionalProperties: false, properties: { title: I18N, points: { type: 'array', items: I18N } } },
  xAxis: I18N, yAxis: I18N } };
const CONCEPT = { type: 'object', required: ['slug'], additionalProperties: false, properties: {
  slug: { type: 'string' }, depth: I18N, analogy: I18N,
  keywords: { type: 'array', items: { type: 'object', required: ['term', 'def'], additionalProperties: false, properties: { term: I18N, def: I18N } } },
  example: { type: 'object', required: ['scenario', 'walkthrough'], additionalProperties: false, properties: { scenario: I18N, walkthrough: I18N } },
  pitfalls: { type: 'array', items: I18N },
  code: { type: 'object', required: ['lang', 'snippet'], additionalProperties: false, properties: { lang: { type: 'string' }, snippet: { type: 'string' }, caption: I18N, annotations: { type: 'array', items: { type: 'object', required: ['line', 'note'], additionalProperties: false, properties: { line: { type: 'number' }, note: I18N } } } } },
  visual: { type: 'object', required: ['widgetId'], additionalProperties: false, properties: { widgetId: { type: 'string', enum: WIDGETS } } },
  architecture: SCHEMATIC, diagram: SCHEMATIC, source: { type: 'string' } } };
const LESSON = { type: 'object', required: ['lessonId', 'concepts'], additionalProperties: false, properties: { lessonId: { type: 'string' }, concepts: { type: 'array', items: CONCEPT } } };

const RULES = 'HARD RULES: Do NOT invoke any Skill. Do NOT use WebFetch/WebSearch/find/grep for skills/docs. Work only from expertise + the input file. Enrich EXACTLY the slugs in the input file, verbatim.';
const VOICE = 'VOICE: engineers climbing to Staff/Principal, but this is a LOWER level (L3/L4/L6/L7) — match the level (L3/L4 = more foundational + concrete; L6/L7 = more strategic/org-scale). Clear, concrete, opinionated, worked-example-first, never generic. NO AI slop. Spanish AUTHORED not machine-translated (correct ¿¡ñ tildes, no calques; "compensación" for tradeoff, "confiable" not "robusto"). Code real+correct+idiomatic <25 lines, annotated. Every specific fact TRUE + grounded in the concept source; no fabricated citations/numbers.';

const enriched = await pipeline(
  ids,
  (lessonId) => agent(
    `You are a Principal engineer + curriculum author enriching one lesson of "level-up", the definitive Junior→Principal guide. Make every concept vivid and digestible, not a wall of text.

LESSON: ${lessonId}
Read the input file with your Read tool: research/breadth-input/${lessonId}.json — it has { lessonId, concepts:[{slug,title,why,source,explanation,keyPoints}] }. The "explanation" is existing prose you ENHANCE around (do not rewrite it).

${RULES}

For EACH concept author (all learner-facing strings bilingual {en,es}):
- keywords: 3-6 {term,def} (the vocabulary at this level).
- example: {scenario, walkthrough} — ONE concrete worked example, real systems/numbers, matched to the level.
- pitfalls: 2-4 concrete failure modes.
- analogy: {en,es} (omit if forced).
- depth: optional deeper paragraph (omit if nothing to add).
- code: real+correct+annotated WHEN code clarifies (algorithms/APIs/config/queries); skip for pure judgment/leadership concepts.
- diagram: an inline Schematic (flow|stack|compare|axes) that depicts the concept. AND, when a SECOND, GENUINELY-DIFFERENT concrete view helps, an architecture Schematic — it MUST NOT restate the diagram (make it a concrete flow/context-map/timeline/mechanism from the worked example). If you can't make it different, omit architecture.
- visual: assign ONE widget id ONLY if it truly fits this concept; else omit. Widgets: ${WIDGET_USES}
- source: keep the concept's cited source if you added facts from it.

Return { lessonId:"${lessonId}", concepts:[...] } with one entry per input slug.`,
    { schema: LESSON, phase: 'Enrich', label: `enrich:${lessonId}`, effort: 'high' }
  ),
  (draft, lessonId) => {
    if (!draft) return null;
    return agent(
      `Ruthless Principal fact-checker + anti-slop editor. Correct this enriched lesson "${lessonId}" and return the full corrected JSON (same schema). Fix wrong claims/Big-O/protocol/numbers/citations/code; de-slop EN; fix ES calques + orthography. Ensure diagram and architecture are GENUINELY DIFFERENT (architecture must not restate diagram — drop it if you can't differentiate). Ensure every visual.widgetId is one of [${WIDGETS.join(', ')}] and truly fits (drop if not). Code <25 lines + correct. Keep the exact same slugs.
Do NOT invoke any Skill or web tool. ${VOICE}

DRAFT:
${JSON.stringify(draft)}`,
      { schema: LESSON, phase: 'Repair', label: `repair:${lessonId}`, effort: 'high' }
    );
  }
);

const clean = enriched.filter(Boolean);
log(`enriched ${clean.length}/${ids.length} breadth lessons`);
return { enriched: clean };
