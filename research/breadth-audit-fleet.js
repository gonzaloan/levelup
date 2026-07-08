export const meta = {
  name: 'levelup-breadth-audit',
  description: 'Audit the 20 breadth lessons for clarity gaps (duplicate diagram/architecture, ES calques or mirrored-EN annotations, mismatched widgets) and report ONLY genuine gaps.',
  phases: [{ title: 'Audit' }],
};
const ids = Array.isArray(args) ? args : [];
if (!ids.length) return { error: 'no ids' };

const RUBRIC = `CLARITY RUBRIC:
- diagram and architecture (if both present) must be GENUINELY DIFFERENT — architecture must not restate diagram.
- No ES calques; no annotation whose es === en (a mirrored/untranslated placeholder — must be real Spanish).
- visual.widgetId must actually fit the concept.
- worked-example-first, concise, real code/architecture where it helps.`;

const SCHEMA = {
  type: 'object', required: ['lessonId', 'verdict', 'gaps'], additionalProperties: false,
  properties: {
    lessonId: { type: 'string' }, verdict: { type: 'string', enum: ['CLEAN', 'GAPS'] },
    gaps: { type: 'array', items: { type: 'object', required: ['slug', 'issue', 'fix'], additionalProperties: false,
      properties: { slug: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } } } },
  },
};

const audits = await parallel(ids.map((id) => () => agent(
  `Audit ONE enriched breadth lesson of "level-up" for clarity gaps. Do NOT invoke any Skill/web tool. Read the lesson object "lessonId":"${id}" in C:/Projects/Personal/level-up/src/content/data/lessons.json.

${RUBRIC}

Be a HIGH but HONEST bar — only report REAL gaps. Especially flag: (a) any annotation note where the Spanish equals the English (mirrored placeholder), (b) architecture that just restates the diagram, (c) mismatched widgets, (d) ES calques. If clean, verdict "CLEAN" + empty gaps. For each gap give {slug, issue, concrete fix}.

Return {lessonId:"${id}", verdict, gaps[]}.`,
  { schema: SCHEMA, label: `audit:${id}`, phase: 'Audit', effort: 'high' }
)));

const clean = audits.filter(Boolean);
const withGaps = clean.filter((a) => a.verdict === 'GAPS');
log(`audited ${clean.length}/${ids.length}; ${withGaps.length} with gaps`);
return { audits: clean, totalGaps: withGaps.reduce((n, a) => n + a.gaps.length, 0) };
