export const meta = {
  name: 'levelup-breadth-repair',
  description: 'Apply breadth-audit fixes: translate mirrored-ES code annotations, localize English-only diagrams to {en,es}, fix ES calques/inconsistencies, remove/replace mismatched widgets, differentiate duplicate diagram/architecture, re-anchor off-by-one code annotations. One agent per lesson writes corrected patches to a file.',
  phases: [{ title: 'Repair' }],
};
const jobs = Array.isArray(args) ? args : [];
if (!jobs.length) return { error: 'no jobs' };

const WIDGETS = ['big-o', 'sort-race', 'consistency', 'rag-pipeline', 'consensus', 'latency-budget', 'token-economics', 'threat-board', 'scaling-curves', 'eval-harness'];
const I18N = { type: 'object', required: ['en', 'es'], additionalProperties: false, properties: { en: { type: 'string' }, es: { type: 'string' } } };
const NODE = { type: 'object', required: ['label'], additionalProperties: false, properties: { label: I18N, note: I18N } };
const COL = { type: 'object', required: ['title', 'points'], additionalProperties: false, properties: { title: I18N, points: { type: 'array', items: I18N } } };
const SCHEMATIC = { type: 'object', required: ['kind', 'caption'], additionalProperties: false, properties: {
  kind: { type: 'string', enum: ['flow', 'stack', 'compare', 'axes'] }, caption: I18N,
  nodes: { type: 'array', items: NODE }, left: COL, right: COL, xAxis: I18N, yAxis: I18N } };
const CODE = { type: 'object', required: ['lang', 'snippet'], additionalProperties: false, properties: {
  lang: { type: 'string' }, snippet: { type: 'string' }, caption: I18N,
  annotations: { type: 'array', items: { type: 'object', required: ['line', 'note'], additionalProperties: false, properties: { line: { type: 'number' }, note: I18N } } } } };
const PATCH = { type: 'object', required: ['slug'], additionalProperties: false, properties: {
  slug: { type: 'string' },
  explanation: I18N, depth: I18N, analogy: I18N,
  keyPoints: { type: 'array', items: I18N },
  pitfalls: { type: 'array', items: I18N },
  architecture: SCHEMATIC, diagram: SCHEMATIC, code: CODE,
  example: { type: 'object', required: ['scenario', 'walkthrough'], additionalProperties: false, properties: { scenario: I18N, walkthrough: I18N } },
  keywords: { type: 'array', items: { type: 'object', required: ['term', 'def'], additionalProperties: false, properties: { term: I18N, def: I18N } } },
  visualWidgetId: { type: 'string' },
  overviewFix: I18N,   // if the gap is on the lesson "overview" pseudo-slug
} };
const OUT = { type: 'object', required: ['lessonId', 'patches'], additionalProperties: false,
  properties: { lessonId: { type: 'string' }, patches: { type: 'array', items: PATCH }, overview: I18N } };

const results = await parallel(jobs.map((job) => () => {
  const gapText = job.gaps.length
    ? `Apply these auditor fixes:\n${job.gaps.map((g, i) => `${i + 1}. [${g.slug}] ISSUE: ${g.issue}\n   FIX: ${g.fix}`).join('\n')}`
    : `Audit this lesson yourself for: mirrored-ES annotations (note.es===note.en), English-only diagrams (plain strings not {en,es}), ES calques, mismatched widgets, duplicate diagram/architecture. Fix any real gaps.`;
  return agent(
    `You are fixing clarity gaps in ONE breadth lesson of "level-up". Do NOT invoke any Skill/web tool.
Read the current content: Read C:/Projects/Personal/level-up/src/content/data/lessons.json and find the lesson object "lessonId":"${job.lessonId}".

${gapText}

RULES:
- Emit a PATCH per affected concept slug with ONLY the fields that must change (do not touch good fields). When you fix a code annotation, return the FULL corrected "code" object for that concept (lang+snippet unchanged, annotations with real bilingual notes and correct line numbers). When you fix a diagram/architecture, return the FULL corrected schematic with ALL strings as {en,es}.
- Mirrored-ES annotations: author real, idiomatic Spanish in note.es (never equal to en).
- English-only diagram/architecture: convert every string (caption, titles, points, node labels/notes, axis labels) to {en,es}.
- ES calques: fix to standard Spanish (corrección not correctitud; biblioteca not librería; "sistema para operar"/"servicio en producción" not "sistema operativo" for an operational system; consistent tradeoff term; Patrocinio not Padrinazgo; keep archetype names consistent).
- Mismatched widget: set "visualWidgetId":"" to REMOVE it (valid: ${WIDGETS.join(', ')}); only set a new one if it truly fits.
- If a gap targets slug "overview", return the corrected lesson overview in the top-level "overview" field ({en,es}).
- All strings bilingual {en,es}, ES authored. Schematic kinds flow/stack/compare/axes.

Return {lessonId:"${job.lessonId}", patches:[...], overview?:{en,es}}.`,
    { schema: OUT, label: `repair:${job.lessonId}`, phase: 'Repair', effort: 'high' }
  );
}));

const clean = results.filter(Boolean);
log(`repaired ${clean.length}/${jobs.length}; ${clean.reduce((n, r) => n + (r.patches ? r.patches.length : 0), 0)} patches`);
return { repairs: clean };
