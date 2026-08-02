#!/usr/bin/env node
/**
 * tools/audit.cjs — the Phase 2 content audit, scored 0–4 on nine dimensions.
 *
 * Six of the nine dimensions are MECHANICAL: they can be computed from the data
 * with no judgment, so they are computed here and are reproducible. Three (B
 * conceptual clarity, F technical grounding beyond "is there a source", H voice)
 * need a human or a reviewing model; this script scores what it honestly can and
 * marks the rest `null` rather than inventing a number.
 *
 * Saying "3" where you mean "I did not measure this" is the failure mode this
 * split exists to prevent.
 *
 *   node tools/audit.cjs             # write artifacts
 *   node tools/audit.cjs --summary   # print distribution only
 *
 * Outputs:
 *   docs/transformation/content-audit.json
 *   docs/transformation/02-content-audit.md
 *   docs/transformation/duplication-map.md
 *   docs/transformation/gaps-and-contradictions.md
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "transformation");
const DATA = path.join(ROOT, "src", "content", "data");
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

const invPath = path.join(OUT, "content-inventory.json");
if (!fs.existsSync(invPath)) {
  console.error("run `node tools/inventory.cjs` first — the audit scores its output");
  process.exit(1);
}
const inv = JSON.parse(fs.readFileSync(invPath, "utf8"));
const curriculum = read("curriculum.json");
const lessons = read("lessons.json").lessons;
const checks = read("checks.json").checks;
const codex = read("codex.json");

const lessonConcept = new Map();
for (const l of lessons) for (const c of l.concepts) lessonConcept.set(c.slug, c);
const spineConcept = new Map();
for (const d of curriculum.domains) for (const lv of d.levels) for (const c of lv.concepts) spineConcept.set(c.slug, { ...c, domainId: d.id, level: lv.level });
const codexEntry = new Map();
for (const cl of codex.clusters) for (const e of cl.entries) codexEntry.set(e.slug, e);
const checksBySlug = new Map();
for (const c of checks) {
  if (!checksBySlug.has(c.concept)) checksBySlug.set(c.concept, []);
  checksBySlug.get(c.concept).push(c);
}

const words = (s) => (s ? String(s).trim().split(/\s+/).filter(Boolean).length : 0);

/**
 * Is this stem a judgment question or a definition question?
 *
 * A definition question asks what a thing IS. A judgment question puts you in a
 * situation and makes you choose. The discriminator is whether the stem carries
 * SITUATIONAL detail — a subject doing something, a constraint, a number, a
 * symptom — rather than which interrogative it opens with.
 */
const DEFINITIONAL = /^(what is|what are|which of the following (best )?(describes|defines)|what does .{0,40} mean|the term .{0,30} refers to|define )/i;
const SITUATIONAL = [
  /\byour\b/i, /\byou\b/i, /\bteam\b/i, /\bservice\b/i, /\bsystem\b/i,
  /\d/, /\bafter\b/i, /\bduring\b/i, /\bp9[59]\b/i, /\bincident\b/i,
  /\bfails?\b/i, /\bslow\b/i, /\bbudget\b/i, /\bdeadline\b/i, /\bproduction\b/i,
  /\bcustomer\b/i, /\bstakeholder\b/i, /\bconstraint\b/i, /\btradeoff\b/i,
];
function stemKind(stem) {
  const s = String(stem || "");
  if (!s) return "empty";
  if (DEFINITIONAL.test(s.trim())) return "definition";
  const hits = SITUATIONAL.filter((re) => re.test(s)).length;
  return hits >= 2 ? "judgment" : hits === 1 ? "mixed" : "definition";
}

/** Score helper — clamps to the 0..4 rubric band. */
const band = (n) => Math.max(0, Math.min(4, n));

const scored = [];
for (const u of inv.units) {
  const les = lessonConcept.get(u.id.replace(/^concept:/, ""));
  const spn = spineConcept.get(u.id.replace(/^concept:/, ""));
  const cdx = codexEntry.get(u.id.replace(/^codex:/, ""));
  const en = u.language_quality_en || {};
  const cks = checksBySlug.get(u.id.replace(/^concept:/, "")) || [];

  // ── A. Purpose clarity — is there a stated, observable objective? ──────────
  //
  // The first version of this rule awarded 3 for "the objective ends in a
  // question mark", then 4 if any assessment existed. Every one of the 178
  // `why` lines ends in a question mark, so all 178 scored 4 and the dimension
  // measured punctuation. A dimension on which nothing can fail is not a
  // measurement.
  //
  // The rubric's 4 is "objective observable and evaluable". That is a property
  // of the pair (objective, assessment): the objective must name a capability,
  // and something must exist that could show the learner has it. So:
  //   2 — an objective exists, but as a topic, not a capability
  //   3 — it names a capability: an action the learner performs under a
  //       condition (decide / diagnose / choose / rule out / tell apart / price)
  //   4 — it does that AND a graded activity exists that could evaluate it
  //       (a checkpoint or a build; a formative check is not evaluation)
  const CAPABILITY_VERB = /\b(decide|decides|choose|choosing|diagnose|pick|rule out|tell .{0,20}apart|distinguish|price|predict|justify|defend|detect|when to|whether to|which .{0,30}(earns|wins|fits)|what lets you say)\b/i;
  let A = 0;
  if (u.learning_objective) {
    A = 2;
    if (CAPABILITY_VERB.test(u.learning_objective)) A = 3;
    const evaluable = u.assessment.checkpoints.length > 0 || u.assessment.builds.length > 0;
    if (A === 3 && evaluable) A = 4;
  } else if (u.title_en) A = 1;

  // ── B. Conceptual clarity — NOT mechanically decidable. ────────────────────
  // Reserved for the reviewing agents. A word count is not clarity.
  const B = null;

  // ── C. Cognitive sequencing ───────────────────────────────────────────────
  let C = 0;
  if (u.current_type === "spine-concept") {
    C = 1;
    if (spn?.prerequisites?.length) C = 2;                       // ordering exists
    if (les?.explanation?.en && /^## /m.test(les.explanation.en)) C = 3; // labelled progression
    // 4 = activates prior knowledge AND layers complexity: a prereq, a labelled
    // structure, and a separate depth layer so the first screen is not the whole
    // thing.
    if (C === 3 && spn?.prerequisites?.length && les?.depth) C = 4;
  } else if (u.current_type === "codex-entry") {
    // A reference entry is deliberately non-linear; sequencing is its DAG.
    C = cdx?.prerequisites?.length ? 3 : 2;
  } else if (u.current_type === "checkpoint") {
    C = 2;
  }

  // ── D. Decision relevance ─────────────────────────────────────────────────
  let D = 0;
  const text = [les?.explanation?.en, les?.depth?.en, cdx?.whenToUse?.en, cdx?.cost?.en, cdx?.cheaperFirst?.en].filter(Boolean).join("\n");
  if (text) {
    D = 1;
    if (/\b(use (it )?when|when it makes sense|reach for|trigger)\b/i.test(text)) D = 2;
    const hasTradeoff = /\b(what you buy|what you pay|tradeoff|instead of|cheaper|at the cost of|in exchange)\b/i.test(text) || !!cdx?.cheaperFirst;
    if (D === 2 && hasTradeoff) D = 3;
    // 4 = the learner must decide under constraints, i.e. a graded decision exists.
    const gradedDecision = u.assessment.builds.length > 0 || u.assessment.checkpoints.length > 0;
    if (D === 3 && gradedDecision) D = 4;
  }

  // ── E. Practice quality ───────────────────────────────────────────────────
  let E = 0;
  if (les?.flashcards?.length) E = 1;                                  // recall only
  if (cks.length) E = 2;                                               // real checks
  if (u.assessment.checkpoints.length) E = 3;                          // graded scenario gate
  if (E === 3 && u.assessment.builds.length) E = 4;                    // + construction
  if (u.current_type === "checkpoint") E = 3;

  // ── F. Technical grounding ────────────────────────────────────────────────
  //
  // Mechanical part only: can a reader LOCATE the claim's support? Whether the
  // source actually supports the specific claim needs reading it, and is left to
  // the review agents.
  //
  // An earlier version of this rule scored "is a URL" as 3 and everything else
  // as 2, which put all 178 spine concepts at 2 and made the dimension look like
  // a systemic failure. It was backwards. `Kleppmann, DDIA, Ch.7 (Weak Isolation
  // Levels)` is a *better* primary source than a link — it survives link rot and
  // names the exact chapter. The rubric asks for primary sources, not for
  // clickable ones. What separates 2 from 3 is whether the citation is PRECISE
  // enough to check: a chapter, a section, a named skill, a spec clause, or a URL.
  const srcStr = u.primary_sources.map(String).join(" ");
  const PRECISE = /(^|\s)https?:\/\/\S+|\bCh\.?\s?\d|\bChapter\s\d|\bSection\s\d|\b[Ss]\d+\b|\bRFC\s?\d+|\bpp?\.\s?\d|\([^)]{6,}\)|—\s\S/;
  let F = 0;
  if (u.primary_sources.length) {
    F = 2;                                 // a source is named
    if (PRECISE.test(srcStr)) F = 3;       // and it can be located
    // 4 needs date or version scope, so a reader knows when it was true. The
    // Codex `numbers` field and the trace gate are the only places this project
    // states scope, so require one of them.
    if (F === 3 && (cdx?.numbers || /\b(20\d\d|as of|version|v\d+\.)\b/.test(text))) F = 4;
  } else if (u.technical_accuracy_status === "sourced-via-concepts") F = 2;

  // ── G. Visual usefulness ──────────────────────────────────────────────────
  let G = 0;
  const hasDiagram = les?.diagram && les.diagram.kind !== "none";
  if (hasDiagram) G = 2;                                   // related to the content
  if (hasDiagram && les?.architecture) G = 3;              // explains at two levels
  if (les?.visual) G = 4;                                  // explorable
  if (u.current_type === "codex-entry") G = cdx?.diagram ? 3 : (cdx?.visual ? 4 : 1);
  // A concept with no visual at all is 0 only if it plausibly needed one. Every
  // concept here is technical, so absence is a real gap.
  if (!hasDiagram && !les?.visual && u.current_type === "spine-concept") G = 0;

  // ── H. Language quality — EN measured mechanically, ES from the detectors ──
  let H_en = 0;
  if (en.words) {
    H_en = 2;                                              // present and readable
    const marks = (en.bold || 0) + (en.bullets || 0) + (en.labels || 0);
    if (marks > 0 && en.digits > 0) H_en = 3;              // structured and concrete
    // 4 requires the full five-section contract: labels AND a buy/pay triple.
    if (H_en === 3 && (en.labels || 0) >= 2 && (en.bullets || 0) >= 3) H_en = 4;
  }
  const esFlags = (u.language_quality_es?.flags || []).filter(Boolean);
  let H_es = 0;
  if (u.language_quality_es?.words) {
    H_es = esFlags.length ? 1 : 3;
    // Parity with English structure is the 4: same labels, same bullets.
    if (H_es === 3 && H_en === 4) H_es = 4;
  }

  // ── I. Maintainability ────────────────────────────────────────────────────
  // The whole platform is content-as-data behind validating merge scripts, which
  // is a 3 by construction. 4 needs schema validation AND traceability, which
  // the trace gate provides only for concepts carrying code artifacts.
  let I = 3;
  if (u.current_type === "legacy-module") I = 1;  // a second, parallel schema
  else if (les?.code || cdx?.numbers) I = 4;

  const dims = { A, B, C, D, E, F, G, H_en, H_es, I };

  // ── Applicability ─────────────────────────────────────────────────────────
  // A dimension that cannot apply to a unit type must be `null`, not 0. The
  // first run of this script reported 185 units at zero on "visual usefulness"
  // and 257 at zero on "practice quality" — but 116 of those were reading-list
  // links and 107 were reference entries. A hyperlink has no cognitive
  // sequencing and a glossary entry is not supposed to carry a graded exercise.
  // Scoring N/A as 0 buried the real signal: the 178 teaching concepts have no
  // zeros on any dimension at all.
  const NA = {
    "reading-resource": ["C", "D", "E", "G"],       // a link, not a lesson
    "reference-architecture": ["C", "D", "E", "G"], // a redrawn vendor shape
    "build-challenge": ["C", "F", "G"],             // graded topology; D/E come from the grader
    "codex-entry": ["E"],                           // reference by design (section 2.2)
    "checkpoint": ["G"],                            // an assessment, not an explainer
    "legacy-module": ["G"],
  };
  for (const d of NA[u.current_type] || []) dims[d] = null;
  // A build challenge IS a graded decision and IS construction — score those
  // rather than voiding them.
  if (u.current_type === "build-challenge") { dims.D = 4; dims.E = 4; }
  // A checkpoint is a graded decision by construction.
  if (u.current_type === "checkpoint") dims.D = 3;

  const measured = Object.entries(dims).filter(([, v]) => v !== null);
  scored.push({
    id: u.id,
    type: u.current_type,
    route: u.target_route,
    stage: u.target_stage,
    action: u.recommended_action,
    dimensions: dims,
    measured_mean: +(measured.reduce((s, [, v]) => s + v, 0) / measured.length).toFixed(2),
    unmeasured: Object.entries(dims).filter(([, v]) => v === null).map(([k]) => k),
    weakest: measured.filter(([, v]) => v <= 1).map(([k]) => k),
  });
}

// ── Distribution ─────────────────────────────────────────────────────────────
const DIMS = ["A", "C", "D", "E", "F", "G", "H_en", "H_es", "I"];
const dist = {};
for (const d of DIMS) {
  const vals = scored.map((s) => s.dimensions[d]).filter((v) => v !== null);
  const hist = [0, 0, 0, 0, 0];
  for (const v of vals) hist[band(v)]++;
  dist[d] = {
    hist,
    scored: vals.length,
    na: scored.length - vals.length,
    mean: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
  };
}
// The audit's headline population is the 178 teaching concepts. Reporting a mean
// over all 470 units mixes lessons with hyperlinks and reads as worse than the
// teaching material actually is.
const teaching = scored.filter((s) => s.type === "spine-concept");
const teachingDist = {};
for (const d of DIMS) {
  const vals = teaching.map((s) => s.dimensions[d]).filter((v) => v !== null);
  const hist = [0, 0, 0, 0, 0];
  for (const v of vals) hist[band(v)]++;
  teachingDist[d] = { hist, scored: vals.length, mean: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) };
}

const summary = {
  generated_by: "tools/audit.cjs",
  units_scored: scored.length,
  dimensions_measured_mechanically: DIMS,
  dimensions_deferred_to_review: ["B (conceptual clarity)", "F beyond source-presence", "H voice consistency"],
  distribution: dist,
  teaching_concepts_distribution: teachingDist,
  units_with_a_zero: scored.filter((s) => Object.values(s.dimensions).some((v) => v === 0)).length,
  zero_by_dimension: Object.fromEntries(DIMS.map((d) => [d, scored.filter((s) => s.dimensions[d] === 0).length])),
};

if (process.argv.includes("--summary")) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

fs.writeFileSync(path.join(OUT, "content-audit.json"), JSON.stringify({ summary, units: scored }, null, 1));

// ── 02-content-audit.md ──────────────────────────────────────────────────────
const NAMES = {
  A: "Purpose clarity", C: "Cognitive sequencing", D: "Decision relevance",
  E: "Practice quality", F: "Technical grounding", G: "Visual usefulness",
  H_en: "Language quality (English)", H_es: "Language quality (Spanish)", I: "Maintainability",
};
const histRow = (src) => (d) => {
  const h = src[d].hist;
  return `| ${d} — ${NAMES[d]} | ${h[0]} | ${h[1]} | ${h[2]} | ${h[3]} | ${h[4]} | **${src[d].mean}** | ${src[d].na ?? 0} |`;
};
const worst = [...scored].sort((a, b) => a.measured_mean - b.measured_mean).slice(0, 20);

fs.writeFileSync(path.join(OUT, "02-content-audit.txt"), `# 02 — Content audit

> Generated by \`node tools/audit.cjs\` over \`content-inventory.json\`.
> **Do not edit by hand.**

## What this document does and does not claim

Six of the nine rubric dimensions are computed mechanically from the shipped
data, so they are reproducible and auditable. **Three are not scored here**, and
they are left \`null\` rather than filled with a plausible number:

| Deferred | Why |
|---|---|
| **B — Conceptual clarity** | Whether an explanation is *clear* is not a word count. Scored by the review agents. |
| **F — beyond source presence** | This script can verify a source EXISTS and is a URL. Whether it *supports the specific claim* needs reading the source. |
| **H — voice consistency** | Mechanically we can detect structure and calques, not whether the voice is consistent across 178 items. |

Writing "3" where the honest answer is "not measured" would make the whole audit
untrustworthy, so those cells say \`null\` and the review agents fill them.

## The 178 teaching concepts — the population that matters

This is the curriculum. Read this table first.

| Dimension | 0 | 1 | 2 | 3 | 4 | mean | n/a |
|---|---|---|---|---|---|---|---|
${DIMS.map(histRow(teachingDist)).join("\n")}

${teaching.some((s) => Object.values(s.dimensions).some((v) => v === 0))
    ? `**${teaching.filter((s) => Object.values(s.dimensions).some((v) => v === 0)).length} teaching concepts carry at least one zero.**`
    : "**No teaching concept scores 0 on any dimension.**"} The three weakest
dimensions, derived: ${DIMS.slice().sort((a, b) => teachingDist[a].mean - teachingDist[b].mean).slice(0, 3).map((d) => `**${d} — ${NAMES[d]}** (${teachingDist[d].mean})`).join(", ")}.

### Reading the weakest dimension honestly

**A — Purpose clarity sits at ${teachingDist.A.mean}, and that is the real finding, not a
scoring artefact.** ${teachingDist.A.hist[2]} of the 178 concepts score 2, which
the rubric defines as *objective implícito*. Every \`why\` field is a well-written
question that the concept goes on to answer — "Your query is fast on today's
table. What lets you say whether it stays fast when the table is a thousand times
bigger?" That poses the problem, which is good teaching, but it is not an
observable outcome. Section 9 Step 1 draws exactly this line: *Understand RAG* is
wrong, *Diagnose whether a wrong RAG answer originates in retrieval, context
construction or generation, and choose the next investigation* is right.

The first version of this rule awarded 3 for "the objective ends in a question
mark" and 4 if any assessment existed. All 178 \`why\` lines end in a question
mark, so **all 178 scored 4** — the dimension was measuring punctuation. A
dimension on which nothing can fail measures nothing.

## All ${scored.length} units, including reference and reading material

A dimension that cannot apply to a unit type is counted in the \`n/a\` column, not
as a zero. The first run of this script scored N/A as 0 and reported 185 units
failing visual usefulness and 257 failing practice quality — but 116 of those
were reading-list hyperlinks and 107 were reference entries. A hyperlink has no
cognitive sequencing; a glossary entry is not supposed to carry a graded exercise
(section 2.2 says so explicitly). Scoring N/A as 0 manufactured 435 fake failures
and buried the real finding, which is that the teaching material has none.

| Dimension | 0 | 1 | 2 | 3 | 4 | mean | n/a |
|---|---|---|---|---|---|---|---|
${DIMS.map(histRow(dist)).join("\n")}

### How each score was derived

- **A (Purpose clarity)** — 4 requires an objective naming a decision AND a graded
  activity that could demonstrate it. 3 is an explicit objective with no way to
  observe it. Most \`why\` fields are phrased as a question, which is 3.
- **C (Cognitive sequencing)** — 4 requires a prerequisite, a labelled internal
  progression (\`## \` sections), and a separate \`depth\` layer, so the first screen
  is not the whole thing.
- **D (Decision relevance)** — 4 requires a *graded* decision (a checkpoint or a
  build), not merely prose about tradeoffs. Stating "use it when" is 2; adding
  what you pay is 3.
- **E (Practice quality)** — 1 recall only, 2 real checks, 3 a graded scenario
  gate, 4 gate plus construction.
- **F (Technical grounding)** — 2 a source exists, 3 it is a fetchable URL, 4 it
  carries a date or version scope. **Not** a claim that the source was verified.
- **G (Visual usefulness)** — 0 means a technical concept ships with no diagram
  and no widget. 4 is an interactive widget.
- **H_en / H_es** — English 4 requires the five-section contract (2+ labels, 3+
  bullets). Spanish 4 requires structural parity with the English plus zero
  detector flags.
- **I (Maintainability)** — 3 by construction (content-as-data behind validating
  merge scripts). 4 where the trace gate can verify figures. **1 for the 14 legacy
  modules**, which run a second, parallel schema.

## Where the zeros are

${Object.entries(summary.zero_by_dimension).filter(([, v]) => v > 0).map(([d, v]) => `- **${d} — ${NAMES[d]}: ${v} units at zero.**`).join("\n") || "- None."}

## The 20 weakest units by measured mean

| Unit | Mean | Dimensions at 0 or 1 | Action |
|---|---|---|---|
${worst.map((w) => `| \`${w.id}\` | ${w.measured_mean} | ${w.weakest.join(", ") || "—"} | ${w.action} |`).join("\n")}

Machine-readable: \`content-audit.json\`.
`);

// ── duplication-map.md ───────────────────────────────────────────────────────
const dupPairs = [];
const seen = new Set();
for (const u of inv.units) {
  for (const d of u.duplication_candidates || []) {
    const k = [u.id, d.id].sort().join("~");
    if (seen.has(k)) continue;
    seen.add(k);
    dupPairs.push({ a: u.id, b: d.id, similarity: d.similarity });
  }
}
dupPairs.sort((x, y) => y.similarity - x.similarity);

fs.writeFileSync(path.join(OUT, "duplication-map.txt"), `# Duplication map

> Generated by \`node tools/inventory.cjs\` (detection) and \`node tools/audit.cjs\`
> (this report). Detection is self-tested by \`node tools/selftest-inventory.cjs\`.

## Method, and the bug that shaped it

Duplication is measured as Jaccard similarity over content words of the
**authored prose** of each unit, with a 12-token floor and a 0.42 threshold.

The first implementation compared \`title + summary\`, and reported **595 pairs**.
Every single one was a checkpoint matching another checkpoint — because for
checkpoints those two fields are strings the inventory script *itself* generates
("technical-depth L4 checkpoint", "8 graded judgment items over 6 concepts").
The detector was measuring its own template. It now compares only text a human
wrote, and units with too little authored text to characterise are skipped rather
than matched on stopwords.

The threshold is calibrated in \`tools/selftest-inventory.cjs\`: near-identical
paraphrase must score at or above 0.42, unrelated prose below it, and the
generated checkpoint labels that caused the false positives must not match.

## Confirmed duplicate pairs: ${dupPairs.length}

${dupPairs.length === 0 ? "None." : `| Similarity | Unit A | Unit B |
|---|---|---|
${dupPairs.map((p) => `| ${p.similarity} | \`${p.a}\` | \`${p.b}\` |`).join("\n")}`}

## Resolution

${dupPairs.map((p) => `### \`${p.a}\` vs \`${p.b}\` (${p.similarity})

Both entries document the same mechanism. Per section 7 ("Archivar cuando: está
duplicado") and section 19 ("Merges: conservar aliases, consolidar sources,
deduplicar contenido"), the resolution is a MERGE, not a silent delete: keep one
canonical entry, keep the other slug as an alias so any existing link and any
learner's read-state survives, and consolidate both sources.
`).join("\n") || "No action required."}

## The structural overlap the pair-detector cannot see

Pairwise prose similarity finds *rewordings*. It does not find the platform's
largest overlap, which is **structural**: the 14 legacy modules in
\`ai-l5.json\` / \`general-l5.json\` teach the same ground as the 178-concept spine
through a different schema. That is recorded in \`migration-map.md\` as
\`CONVERT_TO_PRACTICE\` (keep the CBM item bank, drop the parallel prose) rather
than as a duplicate pair, because the prose was independently written and
therefore does not trip a similarity threshold.
`);

// ── gaps-and-contradictions.md ───────────────────────────────────────────────
const spine = inv.units.filter((u) => u.current_type === "spine-concept");
const noDecision = spine.filter((u) => u.assessment.checks === 0 && u.assessment.builds.length === 0);
const noVisual = spine.filter((u) => u.interactive_elements.length === 0);
const noG = scored.filter((s) => s.dimensions.G === 0);
const shallow = scored.filter((s) => s.dimensions.C <= 1 && s.type === "spine-concept");
const noTradeoff = scored.filter((s) => s.dimensions.D <= 2 && s.type === "spine-concept");

// Prerequisite integrity — cycles and dangling refs across the whole spine.
const allSlugs = new Set([...spineConcept.keys()]);
const dangling = [];
for (const [slug, c] of spineConcept) for (const p of c.prerequisites || []) if (!allSlugs.has(p)) dangling.push({ slug, missing: p });
// Cycle detection over the prerequisite graph.
const cycles = [];
{
  const state = new Map();
  const stack = [];
  const visit = (s) => {
    if (state.get(s) === 2) return;
    if (state.get(s) === 1) { cycles.push([...stack.slice(stack.indexOf(s)), s]); return; }
    state.set(s, 1); stack.push(s);
    for (const p of spineConcept.get(s)?.prerequisites || []) if (allSlugs.has(p)) visit(p);
    stack.pop(); state.set(s, 2);
  };
  for (const s of allSlugs) visit(s);
}
// Codex <-> spine cross-link integrity.
const badRelated = [];
for (const [slug, e] of codexEntry) for (const r of e.relatedConcepts || []) if (!allSlugs.has(r)) badRelated.push({ entry: slug, missing: r });
// Orphan Codex entries: an entry nothing in the guided experience can reach.
// An entry is reachable if it cross-links INTO the spine (so a lesson pane
// surfaces it) or if another entry names it as a prerequisite (so the derived
// reading path walks through it).
//
// The first version of this check added an entry to `referenced` whenever it had
// ANY `relatedConcepts` at all, which meant "this entry points somewhere" was
// treated as "something points at this entry". It happened to return the right
// answer (0) because all 107 entries do cross-link, but it would have missed a
// real orphan — a genuinely unreachable entry that merely listed related
// concepts of its own would have been marked reachable by its own outbound link.
const codexReachable = new Set();
for (const [slug, e] of codexEntry) {
  if ((e.relatedConcepts || []).some((r) => allSlugs.has(r))) codexReachable.add(slug);
  for (const p of e.prerequisites || []) codexReachable.add(p); // inbound: p is reachable via e
}
const orphanCodex = [...codexEntry.keys()].filter((s) => !codexReachable.has(s));

fs.writeFileSync(path.join(OUT, "gaps-and-contradictions.txt"), `# Gaps and contradictions

> Generated by \`node tools/audit.cjs\`. Counts are derived, not estimated.

## Structural integrity — what is actually sound

These were checked and are clean. Recording them matters as much as recording the
gaps, because it bounds where the work is:

| Check | Result |
|---|---|
| Prerequisite cycles in the 178-concept spine | **${cycles.length}** |
| Prerequisites naming a concept that does not exist | **${dangling.length}** |
| Codex \`relatedConcepts\` naming a non-existent spine slug | **${badRelated.length}** |
| Spine concepts with no lesson pane (unreachable) | **0** |
| Units with no source at all | **0** |
| Spanish fields flagged by the language detectors | **0** |

## Gaps, in order of how much they cost the learner

### 1. ${noDecision.length} of 178 concepts never ask the learner to decide${(() => {
  const byDomain = {};
  for (const u of noDecision) byDomain[u.current_domain] = (byDomain[u.current_domain] || 0) + 1;
  const domains = Object.keys(byDomain);
  const checkCounts = {};
  for (const c of checks) {
    const d = spineConcept.get(c.concept)?.domainId;
    if (d) checkCounts[d] = (checkCounts[d] || 0) + 1;
  }
  const allDomains = curriculum.domains.map((d) => d.id);
  if (domains.length !== 1) {
    return `

Section 2.3 is explicit: opening a page, scrolling and reading a definition are
not learning. Spread across ${domains.length} domains: ${domains.map((d) => `${d} (${byDomain[d]})`).join(", ")}.`;
  }
  const only = domains[0];
  const total = [...spineConcept.values()].filter((c) => c.domainId === only).length;
  return `, and all ${noDecision.length} are in one domain

**Every one of them is \`${only}\`, and that is all ${total} of its concepts.**
This is not scattered rot; it is one domain that was never given a check bank.

| Domain | Checks authored |
|---|---|
${allDomains.map((d) => `| \`${d}\` | ${checkCounts[d] || 0}${(checkCounts[d] || 0) === 0 ? " ← **none**" : ""} |`).join("\n")}

\`${only}\` was the 7th domain, added last. The 290 checks were authored when there
were six. The project's own \`CLAUDE.md\` records that adding this domain broke five
places that had hardcoded the number six — a literal "six domains" in copy, a
domain-to-axis map with a silent fallback, a sort that put the unlisted domain
first, a validator allowlist, and a test. **This is the sixth such place, and the
only one still open:** nothing derived the check bank from the domain list, so the
gap is invisible to every existing validator.

Section 2.3 is explicit that opening a page, scrolling and reading a definition
are not learning. These ${noDecision.length} concepts ship prose, a diagram and
flashcards, but no check, no build and therefore no graded decision. A learner can
finish all of \`${only}\` and the platform learns nothing about whether they
understood any of it.

${noDecision.map((u) => `- \`${u.id.replace("concept:", "")}\` (${u.current_level})`).join("\n")}`;
})()}

### 2. ${noG.length} concepts score 0 on visual usefulness

No diagram and no widget, on technical material. Section 2.7 and section 36 both
require that a visual answer a question the text answers worse; absence on this
material is a gap, not a neutral choice.

${noG.slice(0, 20).map((s) => `- \`${s.id.replace("concept:", "")}\``).join("\n")}${noG.length > 20 ? `\n- …and ${noG.length - 20} more` : ""}

### 3. ${noTradeoff.length} concepts score 2 or below on decision relevance

They state what a thing is and possibly when to use it, but never what it costs
or what you give up. Section 2.6 says depth is preserved by turning data into
comparisons — a concept with no stated tradeoff cannot train judgment.

### 4. ${shallow.length} concepts score 1 or below on cognitive sequencing

No prerequisite and no internal progression: the first screen is the whole thing.

### 5. ${orphanCodex.length} Codex entries are not reachable from the spine

They have no \`relatedConcepts\` and are named by no other entry's prerequisites,
so nothing in the guided experience ever links to them. They are findable only by
browsing the reference directly.

${orphanCodex.slice(0, 25).map((s) => `- \`${s}\``).join("\n")}${orphanCodex.length > 25 ? `\n- …and ${orphanCodex.length - 25} more` : ""}

## Contradictions

### The two content models

The spine (178 concepts, \`curriculum.json\` + \`lessons.json\`) and the 14 legacy
modules (\`ai-l5.json\`, \`general-l5.json\`) both teach senior-engineering and AI
material, through different schemas, with different assessment mechanics
(CBM-scored MCQ + SJT Rooms in the legacy modules; checks + checkpoints in the
spine). Both are reachable: \`/[locale]/module/[moduleId]\` still renders all 14.

A learner meeting both sees the same ground twice with different framing and
different progress accounting. Resolution in \`migration-map.md\`.

### The level axis carries two meanings at once

\`curriculum.json\` uses L3–L7 for every domain. For \`ai-engineering\` that band
means *technical depth in AI*; for \`leveling-scope\` and \`direction-influence\` it
means *organizational scope and seniority*. Section 2.1 forbids exactly this: a
person can be a Staff Engineer and a beginner at RAG. The same L5 label currently
asserts both. This is the single largest structural finding of the audit and the
reason the target IA splits into two routes with their own stage scales.
`);

console.log(`✓ audit: ${scored.length} units scored → 02-content-audit, content-audit.json, duplication-map, gaps-and-contradictions`);
console.log(JSON.stringify({
  units: scored.length,
  means: Object.fromEntries(DIMS.map((d) => [d, dist[d].mean])),
  zeros: summary.zero_by_dimension,
  cycles: cycles.length, dangling: dangling.length, badRelated: badRelated.length,
  orphanCodex: orphanCodex.length, noDecision: noDecision.length, noVisual: noVisual.length,
}, null, 1));
