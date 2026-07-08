export const meta = {
  name: 'levelup-content-audit',
  description: 'Audit each flagship lesson against the instructional-clarity rubric (worked-example-first, diagram matches text, real examples/code, concise, no slop) and report ONLY genuine gaps — no rewrite of already-good content.',
  phases: [{ title: 'Audit' }],
};

// args = array of lessonId strings
const ids = Array.isArray(args) ? args : [];
if (!ids.length) return { error: 'no lesson ids' };

const RUBRIC = `CLARITY RUBRIC (from fetched instructional-design research):
- Worked-example-first: concept opens with a concrete real case/example, THEN generalizes (not abstract-definition-first).
- Dual coding: has a diagram/widget that actually depicts the idea (not decorative).
- Real-world: uses a real architecture / incident / code where it clarifies (esp. technical concepts).
- Concise + conversational 2nd-person voice; no filler, no AI slop, no redundancy (diagram not restated in prose).
- Bilingual EN/ES both sharp; ES authored (no calques).`;

const SCHEMA = {
  type: 'object', required: ['lessonId', 'verdict', 'gaps'], additionalProperties: false,
  properties: {
    lessonId: { type: 'string' },
    verdict: { type: 'string', enum: ['CLEAN', 'GAPS'] },
    gaps: { type: 'array', items: { type: 'object', required: ['slug', 'issue', 'fix'], additionalProperties: false,
      properties: { slug: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } } } },
  },
};

const audits = await parallel(ids.map((id) => () => agent(
  `Audit ONE already-enriched flagship lesson of "level-up" for clarity gaps. Do NOT invoke any Skill or web tool. Read the lesson data: use your Read tool on C:/Projects/Personal/level-up/research/flagship-input/${id}.json to see the concept slugs + base text, then read the ENRICHED content for these concepts in C:/Projects/Personal/level-up/src/content/data/lessons.json (find the lesson object with "lessonId":"${id}").

${RUBRIC}

The content already passed a prior review — be a HIGH bar but HONEST: only report a gap if it genuinely violates the rubric (e.g. a concept that opens abstract with no concrete example, a missing/decorative diagram where one is needed, prose that just restates the diagram, or ES calques). If the lesson meets the bar, return verdict "CLEAN" with an empty gaps array. For each real gap give {slug, issue, concrete fix}.

Return {lessonId:"${id}", verdict, gaps[]}.`,
  { schema: SCHEMA, label: `audit:${id}`, phase: 'Audit', effort: 'high' }
)));

const clean = audits.filter(Boolean);
const withGaps = clean.filter((a) => a.verdict === 'GAPS');
log(`audited ${clean.length}/${ids.length}; ${withGaps.length} lessons have gaps, ${clean.length - withGaps.length} clean`);
return { audits: clean, totalGaps: withGaps.reduce((n, a) => n + a.gaps.length, 0) };
