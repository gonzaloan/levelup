export const meta = {
  name: 'level-up-flagship-enrich',
  description: 'Enrich level-up flagship lessons (6xL5 + AI track, 55 concepts) with depth/keywords/code/example/architecture/interactive-widgets/pitfalls/analogy — fact-checked, de-slopped, and gated by 3 PASS/FAIL reviewers.',
  phases: [
    { title: 'Enrich' },
    { title: 'Repair' },
    { title: 'Review' },
    { title: 'FinalFix' },
  ],
};

// args = array of lessonId strings. Each enrich agent READS its own input file
// research/flagship-input/<lessonId>.json (keeps args tiny; the full concept
// data is 278KB total, too big to inline).
const lessonIds = Array.isArray(args) ? args : [];
if (!lessonIds.length) { return { error: 'no flagship lesson ids in args' }; }

// The real interactive widgets available in the kit (components/viz). The
// enricher may ONLY assign one of these ids (or omit visual). Validated again at merge.
const WIDGET_CATALOG = [
  { id: 'big-o', use: 'complexity growth / cost of an algorithm as input grows' },
  { id: 'sort-race', use: 'why n^2 comparisons is a real cost (sorting)' },
  { id: 'consistency', use: 'CAP/PACELC — consistency vs availability/latency tradeoff' },
  { id: 'rag-pipeline', use: 'retrieval-augmented generation stages' },
  { id: 'consensus', use: 'leader election / quorum / replication safety' },
  { id: 'latency-budget', use: 'tail latency (p99) and fan-out' },
  { id: 'token-economics', use: 'LLM unit economics / cost per request at scale' },
  { id: 'threat-board', use: 'STRIDE / threat modeling / OWASP security' },
  { id: 'scaling-curves', use: "Amdahl's law / scaling limits / monolith-vs-microservice cost" },
  { id: 'eval-harness', use: 'evaluation on a set with confidence intervals; eval-driven dev; LLM-as-judge' },
];
const CATALOG_TEXT = WIDGET_CATALOG.map(w => `  - "${w.id}": ${w.use}`).join('\n');

// ── JSON Schema fragments ────────────────────────────────────────────────
const I18N = { type: 'object', required: ['en', 'es'], additionalProperties: false,
  properties: { en: { type: 'string' }, es: { type: 'string' } } };
const CONCEPT_SCHEMA = {
  type: 'object', required: ['slug'], additionalProperties: false,
  properties: {
    slug: { type: 'string' },
    depth: I18N,
    analogy: I18N,
    keywords: { type: 'array', items: { type: 'object', required: ['term', 'def'], additionalProperties: false,
      properties: { term: I18N, def: I18N } } },
    example: { type: 'object', required: ['scenario', 'walkthrough'], additionalProperties: false,
      properties: { scenario: I18N, walkthrough: I18N } },
    pitfalls: { type: 'array', items: I18N },
    code: { type: 'object', required: ['lang', 'snippet'], additionalProperties: false,
      properties: { lang: { type: 'string' }, snippet: { type: 'string' }, caption: I18N,
        annotations: { type: 'array', items: { type: 'object', required: ['line', 'note'], additionalProperties: false,
          properties: { line: { type: 'number' }, note: I18N } } } } },
    visual: { type: 'object', required: ['widgetId'], additionalProperties: false,
      properties: { widgetId: { type: 'string', enum: WIDGET_CATALOG.map(w => w.id) } } },
    architecture: { type: 'object', required: ['kind', 'caption'], additionalProperties: false,
      properties: {
        kind: { type: 'string', enum: ['flow', 'stack', 'compare', 'axes'] },
        caption: I18N,
        nodes: { type: 'array', items: { type: 'object', required: ['label'], additionalProperties: false,
          properties: { label: I18N, note: I18N } } },
        left: { type: 'object', required: ['title', 'points'], additionalProperties: false,
          properties: { title: I18N, points: { type: 'array', items: I18N } } },
        right: { type: 'object', required: ['title', 'points'], additionalProperties: false,
          properties: { title: I18N, points: { type: 'array', items: I18N } } },
        xAxis: I18N, yAxis: I18N,
      } },
    source: { type: 'string' },
  },
};
const LESSON_OUT_SCHEMA = {
  type: 'object', required: ['lessonId', 'concepts'], additionalProperties: false,
  properties: { lessonId: { type: 'string' }, concepts: { type: 'array', items: CONCEPT_SCHEMA } },
};
const REVIEW_SCHEMA = {
  type: 'object', required: ['verdict', 'mustFix'], additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    dimension: { type: 'string' },
    summary: { type: 'string' },
    mustFix: { type: 'array', items: { type: 'object', required: ['lessonId', 'slug', 'issue'], additionalProperties: false,
      properties: { lessonId: { type: 'string' }, slug: { type: 'string' }, issue: { type: 'string' }, field: { type: 'string' } } } },
  },
};

const VOICE = `VOICE + QUALITY BAR (hard):
- Audience: engineers climbing to Staff/Principal. Clear, concise, concrete, opinionated. Never generic.
- NO AI slop: no "in today's fast-paced world", no "it's important to note", no empty hedging, no em-dash tics, no "delve/leverage/robust/seamless" filler. Write like a senior engineer who has been in the room.
- Spanish (es) is AUTHORED, not machine-translated: idiomatic, correct orthography (¿¡ ñ á tildes), no calques ("actualmente" not "en la actualidad" filler, "confiable" not "robusto", "compensación/equilibrio" for tradeoff).
- Code is real and correct (runs / compiles conceptually), idiomatic to its language, and teaches the concept. Keep snippets <25 lines. Annotations point at the teaching line.
- Every enriched claim must be TRUE and, where it's a specific fact, grounded in the concept's cited source. No fabricated citations, standards, or numbers.`;

// ── Phase 1+2: enrich then repair, per lesson (pipeline, no barrier) ───────
const enriched = await pipeline(
  lessonIds,
  // Stage 1 — enrich
  (lessonId) => agent(
    `You are a Principal engineer + curriculum author enriching one lesson of "level-up", the definitive guide to reaching Staff/Principal. Enrich EVERY concept so the lesson is vivid and digestible, not a wall of text.

LESSON: ${lessonId}
First, use your Read tool to read the input file: research/flagship-input/${lessonId}.json
It contains { lessonId, concepts: [{slug, title, why, source, explanation, keyPoints, ...}] }. The "explanation" is the existing prose you are ENHANCING — DO NOT rewrite it, ADD layers around it.

For EACH concept, author (all learner-facing strings bilingual {en,es}):
- keywords: 3-6 key terms with crisp one-line definitions (the vocabulary a Staff engineer uses for this concept).
- example: ONE concrete worked example — scenario (the situation) + walkthrough (how a strong engineer reasons through it). Real systems, real numbers.
- pitfalls: 2-4 specific ways this goes wrong in practice ("how this bites you").
- analogy: one plain-language analogy that makes the idea click (skip if forced).
- depth: an optional deeper "go further" paragraph (only when there's genuine depth to add).
- code: a real, correct, idiomatic code sample WHEN code clarifies (algorithms, APIs, config, queries). With line annotations pointing at the teaching lines. Skip for pure-judgment/leadership concepts.
- architecture: a schematic (kind flow|stack|compare|axes) WHEN a system/structure view helps. flow=ordered steps, stack=layers, compare=two columns, axes=2-axis tradeoff space.
- visual: assign ONE interactive widget id ONLY if it genuinely fits this concept; otherwise omit. Available widgets:
${CATALOG_TEXT}
- source: keep/echo the concept's cited source if you added specific facts from it.

${VOICE}

Return the lesson's enriched concepts (set lessonId to "${lessonId}"). Include a concept entry ONLY for concepts you enriched (you should enrich all). Omit any field you didn't author (don't emit empty objects).`,
    { schema: LESSON_OUT_SCHEMA, phase: 'Enrich', label: `enrich:${lessonId}` }
  ),
  // Stage 2 — fact-check + de-slop repair
  (draft, lessonId) => {
    if (!draft) return null;
    return agent(
      `You are a ruthless Principal-level fact-checker AND anti-slop editor. Here is an enriched lesson draft for "${lessonId}". Do TWO things and return the CORRECTED full lesson JSON (same schema):
1) FACT-CHECK: fix any technically wrong claim, wrong Big-O, wrong protocol detail, fabricated standard/number/citation, or incorrect code. If a code sample is wrong, fix it. If a claim can't be grounded, make it correct and general rather than fabricated-specific.
2) DE-SLOP: rewrite any generic/AI-sounding phrasing into sharp senior-engineer prose; fix Spanish calques and orthography; remove filler and em-dash tics.
Also: ensure every visual.widgetId is one of [${WIDGET_CATALOG.map(w => w.id).join(', ')}] and actually fits; drop it if not. Ensure code snippets are <25 lines and correct.

${VOICE}

DRAFT:
${JSON.stringify(draft)}

Return the full corrected lesson (lessonId + concepts).`,
      { schema: LESSON_OUT_SCHEMA, phase: 'Repair', label: `repair:${lessonId}` }
    );
  }
);

const clean = enriched.filter(Boolean);
log(`enriched ${clean.length}/${lessonIds.length} flagship lessons`);
if (!clean.length) return { error: 'enrichment produced nothing', enriched: [] };

// ── Phase 3+4: global 3-reviewer PASS/FAIL gate, loop until unanimous ──────
// Reviewers see a compact index (too big to send everything verbatim), plus can
// call out specific lesson/slug/field issues. A repair agent applies must-fixes.
function indexOf(set) {
  return set.map(l => ({
    lessonId: l.lessonId,
    concepts: (l.concepts || []).map(c => ({
      slug: c.slug,
      has: [c.keywords && 'keywords', c.example && 'example', c.pitfalls && 'pitfalls',
        c.analogy && 'analogy', c.code && 'code', c.architecture && 'architecture',
        c.visual && `visual:${c.visual.widgetId}`, c.depth && 'depth'].filter(Boolean),
    })),
  }));
}

let current = clean;
let round = 0;
let passed = false;
const DIMS = [
  { key: 'technical', prompt: 'TECHNICAL CORRECTNESS: are all claims, Big-O, protocol details, code, numbers, and citations correct and non-fabricated? Sample deeply.' },
  { key: 'pedagogy', prompt: 'CONTENT + PEDAGOGY: is each concept clearer and more engaging than plain text? Are examples concrete, pitfalls real, analogies apt, vocabulary Staff-level? Is anything padded or generic?' },
  { key: 'voice-i18n', prompt: 'VOICE + BILINGUAL QUALITY: is the EN sharp senior-engineer prose free of AI slop, and is the ES authored/idiomatic (correct orthography, no calques)?' },
];

while (round < 3 && !passed) {
  round++;
  // Reviewers get the compact index + a few full-lesson samples for depth.
  const idx = indexOf(current);
  const samples = current.slice(0, 3); // deep-read the first three lessons in full
  const reviews = await parallel(DIMS.map(d => () => agent(
    `You are reviewer "${d.key}" for the level-up flagship enrichment (round ${round}). Judge PASS/FAIL on your dimension. Be adversarial: FAIL if you find real problems; list them as mustFix with lessonId + slug + the issue (and field if specific). PASS only if the set genuinely meets a definitive-guide bar on your dimension.

YOUR DIMENSION — ${d.prompt}

COVERAGE INDEX (every lesson/concept + which enriched fields it has):
${JSON.stringify(idx)}

FULL SAMPLES (read these in depth):
${JSON.stringify(samples).slice(0, 60000)}

Return {verdict, dimension:"${d.key}", summary, mustFix[]}.`,
    { schema: REVIEW_SCHEMA, phase: 'Review', label: `review:${d.key}:r${round}` }
  )));

  const valid = reviews.filter(Boolean);
  passed = valid.length === DIMS.length && valid.every(r => r.verdict === 'PASS');
  const fixes = valid.flatMap(r => (r.verdict === 'FAIL' ? (r.mustFix || []) : []));
  log(`review round ${round}: ${valid.map(r => `${r.dimension}=${r.verdict}`).join(', ')} · ${fixes.length} must-fix`);
  if (passed || !fixes.length) { passed = passed || !fixes.length; break; }

  // Apply must-fixes: group by lesson, repair only affected lessons.
  const byLesson = {};
  for (const f of fixes) (byLesson[f.lessonId] ||= []).push(f);
  current = await parallel(current.map(lesson => async () => {
    const lf = byLesson[lesson.lessonId];
    if (!lf || !lf.length) return lesson;
    const fixed = await agent(
      `Apply these reviewer must-fixes to the enriched lesson "${lesson.lessonId}" and return the full corrected lesson JSON (same schema). Fix ONLY what's raised (and anything clearly analogous); keep everything else intact.

MUST-FIX:
${JSON.stringify(lf, null, 1)}

${VOICE}

CURRENT LESSON:
${JSON.stringify(lesson)}

Return the full corrected lesson.`,
      { schema: LESSON_OUT_SCHEMA, phase: 'FinalFix', label: `fix:${lesson.lessonId}:r${round}` }
    );
    return fixed || lesson;
  }));
  current = current.filter(Boolean);
}

log(`review ${passed ? 'PASSED' : 'did NOT fully converge'} after ${round} round(s)`);
return { enriched: current, passed, rounds: round };
