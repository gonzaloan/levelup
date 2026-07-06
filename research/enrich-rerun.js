export const meta = {
  name: 'level-up-flagship-enrich-rerun',
  description: 'Re-run enrichment for the 6 flagship lessons that failed the first pass (technical-depth-l5, execution-delivery-l5, ai-engineering l4/l5/l6/l7) — skill-invocation forbidden, exact slugs pinned, fact-checked + de-slopped.',
  phases: [{ title: 'Enrich' }, { title: 'Repair' }],
};

// args = [{ lessonId, slugs: [...] }, ...]
const targets = Array.isArray(args) ? args : [];
if (!targets.length) return { error: 'no targets' };

const WIDGETS = ['big-o','sort-race','consistency','rag-pipeline','consensus','latency-budget','token-economics','threat-board','scaling-curves','eval-harness'];
const WIDGET_USES = `  - big-o: complexity growth. sort-race: n^2 sorting cost. consistency: CAP/PACELC tradeoff. rag-pipeline: RAG stages. consensus: quorum/leader election. latency-budget: p99/fan-out. token-economics: LLM cost per request. threat-board: STRIDE/OWASP security. scaling-curves: Amdahl/scaling limits. eval-harness: eval sets/CI/LLM-judge.`;

const I18N = { type: 'object', required: ['en','es'], additionalProperties: false, properties: { en: { type: 'string' }, es: { type: 'string' } } };
const CONCEPT = { type: 'object', required: ['slug'], additionalProperties: false, properties: {
  slug: { type: 'string' }, depth: I18N, analogy: I18N,
  keywords: { type: 'array', items: { type: 'object', required: ['term','def'], additionalProperties: false, properties: { term: I18N, def: I18N } } },
  example: { type: 'object', required: ['scenario','walkthrough'], additionalProperties: false, properties: { scenario: I18N, walkthrough: I18N } },
  pitfalls: { type: 'array', items: I18N },
  code: { type: 'object', required: ['lang','snippet'], additionalProperties: false, properties: { lang: { type: 'string' }, snippet: { type: 'string' }, caption: I18N, annotations: { type: 'array', items: { type: 'object', required: ['line','note'], additionalProperties: false, properties: { line: { type: 'number' }, note: I18N } } } } },
  visual: { type: 'object', required: ['widgetId'], additionalProperties: false, properties: { widgetId: { type: 'string', enum: WIDGETS } } },
  architecture: { type: 'object', required: ['kind','caption'], additionalProperties: false, properties: {
    kind: { type: 'string', enum: ['flow','stack','compare','axes'] }, caption: I18N,
    nodes: { type: 'array', items: { type: 'object', required: ['label'], additionalProperties: false, properties: { label: I18N, note: I18N } } },
    left: { type: 'object', required: ['title','points'], additionalProperties: false, properties: { title: I18N, points: { type: 'array', items: I18N } } },
    right: { type: 'object', required: ['title','points'], additionalProperties: false, properties: { title: I18N, points: { type: 'array', items: I18N } } },
    xAxis: I18N, yAxis: I18N } },
  source: { type: 'string' } } };
const LESSON = { type: 'object', required: ['lessonId','concepts'], additionalProperties: false, properties: { lessonId: { type: 'string' }, concepts: { type: 'array', items: CONCEPT } } };

const RULES = `HARD RULES:
- Do NOT invoke any Skill. Do NOT use WebFetch/WebSearch. Do NOT run find/grep to look for skills or docs. Work only from your own expertise + the input file.
- You MUST enrich EXACTLY these concept slugs, using them verbatim (do NOT invent, rename, split, or merge slugs):`;

const VOICE = `VOICE: engineers climbing to Staff/Principal. Clear, concrete, opinionated, never generic. NO AI slop (no "in today's world", "it's important to note", em-dash tics, "delve/leverage/robust/seamless"). Spanish is AUTHORED not machine-translated (correct ¿¡ñ tildes, no calques; "compensación" for tradeoff, "confiable" not "robusto"). Code is real, correct, idiomatic, <25 lines, annotated on the teaching line. Every specific fact must be TRUE and grounded in the concept's source; no fabricated citations/numbers.`;

const results = await pipeline(
  targets,
  (tgt) => agent(
    `You are a Principal engineer enriching one lesson of "level-up", the definitive guide to reaching Staff/Principal.

LESSON: ${tgt.lessonId}
Read the input file with your Read tool: research/flagship-input/${tgt.lessonId}.json (it has each concept's existing explanation + keyPoints — ENHANCE around them, do not rewrite them).

${RULES}
${tgt.slugs.map(s => `    - ${s}`).join('\n')}

For EACH slug author (all learner-facing strings bilingual {en,es}): keywords (3-6 term+def), example (scenario+walkthrough, real systems/numbers), pitfalls (2-4 concrete failure modes), analogy (skip if forced), depth (optional deeper paragraph), code (real+correct+annotated WHEN code clarifies; skip for pure leadership concepts), architecture (flow|stack|compare|axes WHEN a structure view helps), visual (assign ONE widget id ONLY if it truly fits, else omit). Widgets:
${WIDGET_USES}
Keep the concept's cited source in "source" if you added facts from it.

${VOICE}

Return { lessonId: "${tgt.lessonId}", concepts: [...] } with one entry per slug above.`,
    { schema: LESSON, phase: 'Enrich', label: `enrich:${tgt.lessonId}`, effort: 'high' }
  ),
  (draft, tgt) => {
    if (!draft) return null;
    return agent(
      `Ruthless Principal fact-checker + anti-slop editor. Correct this enriched lesson "${tgt.lessonId}" and return the full corrected JSON (same schema). Fix wrong claims/Big-O/protocol/numbers/citations/code; de-slop EN; fix ES calques+orthography. Ensure every visual.widgetId is one of [${WIDGETS.join(', ')}] and fits (drop if not). Keep code <25 lines and correct. Keep the exact same slugs.

Do NOT invoke any Skill or web tool. Work from expertise only.
${VOICE}

DRAFT:
${JSON.stringify(draft)}`,
      { schema: LESSON, phase: 'Repair', label: `repair:${tgt.lessonId}`, effort: 'high' }
    );
  }
);

const clean = results.filter(Boolean);
log(`re-enriched ${clean.length}/${targets.length} lessons`);
return { enriched: clean };
