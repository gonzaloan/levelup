export const meta = {
  name: 'levelup-content-repair',
  description: 'Apply the auditor fixes: differentiate duplicate diagram/architecture slots, fix ES calques, fix mismatched widgets. One agent per lesson-with-gaps writes corrected concept fields to a file. Also audits+repairs ai-engineering-l6 (audit errored).',
  phases: [{ title: 'Repair' }],
};

// args = [{ lessonId, gaps: [{slug, issue, fix}] }, ...]  (l6 passed with gaps:[] to trigger audit+fix)
const jobs = Array.isArray(args) ? args : [];
if (!jobs.length) return { error: 'no jobs' };

const I18N = { type: 'object', required: ['en', 'es'], additionalProperties: false, properties: { en: { type: 'string' }, es: { type: 'string' } } };
const NODE = { type: 'object', required: ['label'], additionalProperties: false, properties: { label: I18N, note: I18N } };
const COL = { type: 'object', required: ['title', 'points'], additionalProperties: false, properties: { title: I18N, points: { type: 'array', items: I18N } } };
const SCHEMATIC = { type: 'object', required: ['kind', 'caption'], additionalProperties: false, properties: {
  kind: { type: 'string', enum: ['flow', 'stack', 'compare', 'axes'] }, caption: I18N,
  nodes: { type: 'array', items: NODE }, left: COL, right: COL, xAxis: I18N, yAxis: I18N } };
// A patch: for a concept slug, any of these fields to REPLACE (only the ones that need fixing).
const PATCH = { type: 'object', required: ['slug'], additionalProperties: false, properties: {
  slug: { type: 'string' },
  explanation: I18N, depth: I18N,
  keyPoints: { type: 'array', items: I18N },
  architecture: SCHEMATIC, diagram: SCHEMATIC,
  visualWidgetId: { type: 'string' },   // set to "" to REMOVE a mismatched widget
  example: { type: 'object', required: ['scenario', 'walkthrough'], additionalProperties: false, properties: { scenario: I18N, walkthrough: I18N } },
} };
const OUT = { type: 'object', required: ['lessonId', 'patches'], additionalProperties: false,
  properties: { lessonId: { type: 'string' }, patches: { type: 'array', items: PATCH } } };

const WIDGETS = 'big-o, sort-race, consistency, rag-pipeline, consensus, latency-budget, token-economics, threat-board, scaling-curves, eval-harness';

const results = await parallel(jobs.map((job) => () => {
  const gapText = job.gaps.length
    ? `Apply these specific auditor fixes:\n${job.gaps.map((g, i) => `${i + 1}. [${g.slug}] ISSUE: ${g.issue}\n   FIX: ${g.fix}`).join('\n')}`
    : `This lesson was NOT audited yet. First audit its concepts against the clarity rubric (duplicate diagram+architecture slots that restate each other = the #1 issue; ES calques; mismatched widgets), then fix any real gaps you find. If clean, return empty patches.`;
  return agent(
    `You are fixing clarity gaps in ONE flagship lesson of "level-up". Do NOT invoke any Skill or web tool.
Read the current enriched content: use Read on C:/Projects/Personal/level-up/src/content/data/lessons.json and find the lesson object "lessonId":"${job.lessonId}". Also read C:/Projects/Personal/level-up/research/flagship-input/${job.lessonId}.json for base context.

${gapText}

RULES:
- Produce a PATCH per affected concept slug with ONLY the fields that must change (do not touch good fields).
- The #1 fix: when diagram and architecture are near-duplicates, keep the inline "diagram" as-is and REPLACE "architecture" with a genuinely DIFFERENT, concrete depiction (a real flow/context-map/timeline/mechanism from that concept own worked example) — never a second copy of the same compare.
- Fix ES calques into idiomatic authored Spanish (e.g. no "prompt-ear tu camino", no invented verbs like "Retroceas", no "arquitectura de astronauta").
- If a widget is mismatched to the concept and no listed widget fits, set "visualWidgetId":"" to REMOVE it (valid widgets: ${WIDGETS}).
- Architecture schematic kinds: flow/stack/compare/axes. flow/stack use nodes[{label,note}]; compare uses left/right{title,points[]}; axes uses xAxis/yAxis. All strings bilingual {en,es}, ES authored.
- Keep everything concise, worked-example-first, no slop.

Return {lessonId:"${job.lessonId}", patches:[...]}.`,
    { schema: OUT, label: `repair:${job.lessonId}`, phase: 'Repair', effort: 'high' }
  );
}));

const clean = results.filter(Boolean);
log(`repaired ${clean.length}/${jobs.length} lessons; ${clean.reduce((n, r) => n + r.patches.length, 0)} patches`);
return { repairs: clean };
