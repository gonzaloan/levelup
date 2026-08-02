#!/usr/bin/env node
/**
 * tools/inventory.cjs — the reproducible content inventory.
 *
 * Walks every shipped content source and emits one row per learner-facing unit.
 * Nothing here is authored by hand: re-running it after a content change
 * regenerates the numbers, which is the point. The transformation prompt
 * forbids invented counts, so every figure in docs/transformation/ traces to
 * this script.
 *
 *   node tools/inventory.cjs            # write the artifacts
 *   node tools/inventory.cjs --summary  # print counts only, write nothing
 *
 * Outputs:
 *   docs/transformation/content-inventory.json
 *   docs/transformation/content-inventory.csv
 *   docs/transformation/01-content-inventory.md
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "src", "content", "data");
const OUT = path.join(ROOT, "docs", "transformation");

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

const curriculum = read("curriculum.json");
const lessons = read("lessons.json").lessons;
const checks = read("checks.json").checks;
const codex = read("codex.json");
const resources = read("resources.json").resources;
const builds = read("builds.json").builds;
const aiL5 = read("ai-l5.json");
const generalL5 = read("general-l5.json");

// ── The target taxonomy (ADR-001/002): technical capability and organizational
// scope are SEPARATE axes. A domain maps to one route; the L3–L7 band maps to a
// stage on that route's own scale. See docs/transformation/
// target-information-architecture.md.
const ROUTE_OF_DOMAIN = {
  "ai-engineering": "ai-architect",
  "cloud-platform": "shared-foundations",
  "systems-architecture": "shared-foundations",
  "technical-depth": "shared-foundations",
  "execution-delivery": "staff-engineer",
  "direction-influence": "staff-engineer",
  "leveling-scope": "staff-engineer",
};
// Route-local stage for a spine level. AI Architect stages are capability
// bands; Staff Engineer stages are scope bands; Shared Foundations has depth
// tiers rather than stages, because a foundation is not a rung.
const STAGE_OF = {
  "ai-architect": { L3: "A1", L4: "A2", L5: "A3", L6: "A4", L7: "A5" },
  "staff-engineer": { L3: "S1", L4: "S2", L5: "S3", L6: "S4", L7: "S5" },
  "shared-foundations": { L3: "F1", L4: "F1", L5: "F2", L6: "F3", L7: "F3" },
};

const words = (s) => (s ? String(s).trim().split(/\s+/).filter(Boolean).length : 0);

/** Reading minutes at 200 wpm, floored at 1, plus 1 per interactive element. */
function minutes(wordCount, interactives) {
  return Math.max(1, Math.round(wordCount / 200)) + interactives;
}

/**
 * Language quality is measured, not guessed. These are the mechanical signals
 * the prose gate already understands; the judgment dimensions (voice, literal
 * translation) come from the audit reviewers, not from here.
 */
const CALQUES = [
  /\brobust[oa]s?\b/i, /\brobustez\b/i, /\bcorrectitud\b/i, /\bliber[íi]a\b/i,
  /\blibrer[íi]as?\b/i, /\bencriptar\b/i, /\bsopor tar\b/i,
];
// "Was this field ever translated?" — measured, not guessed.
//
// Two earlier rules were WRONG and both were caught by measuring instead of
// asserting:
//   1. "no diacritics past 40 words" MISSED a 35-word untranslated paragraph,
//      and when tightened to 25 words it FIRED ON 10 pieces of correct Spanish.
//      Real authored Spanish runs up to 52 words with no accented character
//      ("Reordenar un conjunto de candidatos con un puntaje que suma…"), so
//      there is no threshold on that signal that both catches and spares.
//   2. Raw English-function-word density overlaps: correct Spanish reaches
//      0.179 and correct English starts at 0.107.
//
// What DOES separate is the DIFFERENCE between English and Spanish function-word
// density. Over the 820 authored Spanish and 820 authored English fields that
// ship today: Spanish tops out at -0.061, English bottoms out at +0.107 — a
// clean 0.168 gap with no overlap. The threshold sits in the middle of that gap.
// tools/selftest-inventory.cjs replays both defect classes and both
// false-positive classes against it.
const EN_FUNCTION = /\b(the|and|with|which|from|that|this|these|those|when|what|your|you|for|are|is|was|were|will|would|should|could|not|but|than|then|because|so|it|its|they|their|there|have|has|had|been|being|of|to|in|on|at|by|as|an|a)\b/gi;
const ES_FUNCTION = /\b(que|de|la|el|los|las|un|una|con|para|por|se|su|sus|es|son|no|si|como|del|al|en|y|o|lo|le|más|pero|cuando|donde|esta|este|esa|ese|hay|ya|sin|sobre)\b/gi;
const LANG_MARGIN = 0.02; // midpoint of the measured [-0.061, +0.107] gap
function langSkew(s) {
  const total = words(s);
  if (!total) return 0;
  const en = (s.match(EN_FUNCTION) || []).length / total;
  const es = (s.match(ES_FUNCTION) || []).length / total;
  return en - es; // > 0 reads as English, < 0 reads as Spanish
}
function esSignals(es) {
  const flags = [];
  if (!es) return ["missing"];
  // Below 12 words there is not enough signal to call it either way, and a
  // 5-word technical label ("Chunk fijo de 512 tokens") legitimately has none.
  if (words(es) >= 12 && langSkew(es) > LANG_MARGIN) flags.push("untranslated");
  for (const re of CALQUES) if (re.test(es)) flags.push("calque");
  if (/\beventualmente\b/i.test(es) && !/eventualmente consistente/i.test(es)) flags.push("false-friend");
  return flags;
}

/** The five-section rewrite contract, as detectable marks (see check-prose.cjs). */
function contractMarks(en) {
  if (!en) return { bold: 0, bullets: 0, labels: 0, digits: 0, paragraphs: 0 };
  return {
    bold: (en.match(/\*\*/g) || []).length / 2,
    bullets: (en.match(/^- /gm) || []).length,
    labels: (en.match(/^## /gm) || []).length,
    digits: (en.match(/\d/g) || []).length,
    paragraphs: en.split(/\n\n+/).filter(Boolean).length,
  };
}

const rows = [];
const seenIds = new Set();
function push(row) {
  if (seenIds.has(row.id)) throw new Error(`duplicate inventory id: ${row.id}`);
  seenIds.add(row.id);
  rows.push(row);
}

// ── 1. Spine concepts (the 178) ──────────────────────────────────────────────
const lessonByConcept = new Map();
for (const l of lessons) for (const c of l.concepts) lessonByConcept.set(c.slug, { lesson: l, concept: c });

const checksByConcept = new Map();
for (const c of checks) {
  if (!checksByConcept.has(c.concept)) checksByConcept.set(c.concept, []);
  checksByConcept.get(c.concept).push(c);
}
const buildsByConcept = new Map();
for (const b of builds) {
  if (!buildsByConcept.has(b.concept)) buildsByConcept.set(b.concept, []);
  buildsByConcept.get(b.concept).push(b);
}
const checkpointByConcept = new Map();
for (const cp of curriculum.checkpoints) {
  for (const slug of cp.coversConcepts) {
    if (!checkpointByConcept.has(slug)) checkpointByConcept.set(slug, []);
    checkpointByConcept.get(slug).push(cp.id);
  }
}
const codexByConcept = new Map();
for (const cl of codex.clusters) {
  for (const e of cl.entries) {
    for (const slug of e.relatedConcepts || []) {
      if (!codexByConcept.has(slug)) codexByConcept.set(slug, []);
      codexByConcept.get(slug).push(e.slug);
    }
  }
}
const resourcesByConcept = new Map();
for (const r of resources) {
  for (const slug of r.concepts || []) {
    if (!resourcesByConcept.has(slug)) resourcesByConcept.set(slug, []);
    resourcesByConcept.get(slug).push(r.id);
  }
}

for (const d of curriculum.domains) {
  const route = ROUTE_OF_DOMAIN[d.id];
  if (!route) throw new Error(`domain ${d.id} has no route mapping — update ROUTE_OF_DOMAIN`);
  for (const lv of d.levels) {
    for (const c of lv.concepts) {
      const pair = lessonByConcept.get(c.slug);
      const lesson = pair?.concept;
      const en = lesson?.explanation?.en || "";
      const es = lesson?.explanation?.es || "";
      const marks = contractMarks(en);
      const interactives = (lesson?.visual ? 1 : 0) + (checksByConcept.get(c.slug) || []).length;
      const cks = checksByConcept.get(c.slug) || [];
      const kinds = [...new Set(cks.map((k) => k.kind))];
      const layers = [
        lesson?.depth && "depth", lesson?.keywords && "keywords", lesson?.code && "code",
        lesson?.example && "example", lesson?.architecture && "architecture",
        lesson?.pitfalls && "pitfalls", lesson?.analogy && "analogy",
        lesson?.children && "children", lesson?.mnemonic && "mnemonic",
        lesson?.flashcards && "flashcards",
      ].filter(Boolean);

      push({
        id: `concept:${c.slug}`,
        title_en: c.title?.en || "", title_es: c.title?.es || "",
        current_type: "spine-concept",
        current_route: pair ? `/[locale]/lesson/${pair.lesson.lessonId}` : "(unreachable)",
        current_level: lv.level,
        current_domain: d.id,
        summary: (c.why?.en || "").slice(0, 240),
        learning_objective: c.why?.en || "",
        actual_user_action: [
          lesson ? "read" : null,
          lesson?.visual ? "manipulate-widget" : null,
          cks.length ? "answer-check" : null,
          (buildsByConcept.get(c.slug) || []).length ? "assemble-architecture" : null,
          (checkpointByConcept.get(c.slug) || []).length ? "graded-checkpoint" : null,
          lesson?.flashcards ? "self-graded-recall" : null,
        ].filter(Boolean).join("+") || "none",
        estimated_minutes: minutes(words(en) + words(lesson?.depth?.en), interactives),
        prerequisites: c.prerequisites || [],
        related_concepts: codexByConcept.get(c.slug) || [],
        primary_sources: [c.source, lesson?.source].filter(Boolean),
        images: lesson?.diagram?.kind && lesson.diagram.kind !== "none" ? [`schematic:${lesson.diagram.kind}`] : [],
        interactive_elements: [lesson?.visual?.widgetId, ...kinds].filter(Boolean),
        assessment: {
          checks: cks.length, checkKinds: kinds,
          checkpoints: checkpointByConcept.get(c.slug) || [],
          builds: (buildsByConcept.get(c.slug) || []).map((b) => b.id),
        },
        language_quality_en: { words: words(en), ...marks },
        language_quality_es: { words: words(es), flags: esSignals(es) },
        technical_accuracy_status: c.source ? "sourced" : "UNSOURCED",
        content_depth: layers.length,
        cognitive_load: words(en) + words(lesson?.depth?.en) + layers.length * 40,
        duplication_candidates: [],
        // targets filled by classify() below
        target_route: route,
        target_stage: STAGE_OF[route][lv.level],
        target_type: null,
        recommended_action: null,
        migration_notes: "",
        confidence: lesson ? "high" : "medium",
        _resources: resourcesByConcept.get(c.slug) || [],
        _layers: layers,
        _prose: en,
      });
    }
  }
}

// ── 2. Codex entries ─────────────────────────────────────────────────────────
for (const cl of codex.clusters) {
  for (const e of cl.entries) {
    const en = [e.definition?.en, e.howItWorks?.en, e.whenToUse?.en].filter(Boolean).join("\n\n");
    push({
      id: `codex:${e.slug}`,
      title_en: e.term?.en || "", title_es: e.term?.es || "",
      current_type: "codex-entry",
      current_route: `/[locale]/codex#${e.slug}`,
      current_level: null,
      current_domain: cl.slug,
      summary: (e.definition?.en || "").slice(0, 240),
      learning_objective: e.whenToUse?.en || "",
      actual_user_action: "look-up",
      estimated_minutes: minutes(words(en), e.visual ? 1 : 0),
      prerequisites: e.prerequisites || [],
      related_concepts: e.relatedConcepts || [],
      primary_sources: e.source ? [e.source] : [],
      images: e.diagram?.kind && e.diagram.kind !== "none" ? [`schematic:${e.diagram.kind}`] : [],
      interactive_elements: e.visual ? [e.visual.widgetId] : [],
      assessment: { checks: 0, checkKinds: [], checkpoints: [], builds: [] },
      language_quality_en: { words: words(en), ...contractMarks(en) },
      language_quality_es: { words: words(e.definition?.es), flags: esSignals(e.definition?.es) },
      technical_accuracy_status: e.source ? "sourced" : "UNSOURCED",
      content_depth: [e.cost, e.cheaperFirst, e.failureMode, e.numbers].filter(Boolean).length,
      cognitive_load: words(en),
      duplication_candidates: [],
      target_route: "shared-foundations",
      target_stage: null,
      target_type: "codex",
      recommended_action: "KEEP",
      migration_notes: "Codex is already reference-shaped; it stays the canonical layer.",
      confidence: "high",
      _resources: [],
      _layers: [],
      _prose: en,
    });
  }
}

// ── 3. Codex architectures ───────────────────────────────────────────────────
for (const a of codex.architectures) {
  push({
    id: `architecture:${a.slug}`,
    title_en: a.name?.en || "", title_es: a.name?.es || "",
    current_type: "reference-architecture",
    current_route: `/[locale]/codex#arch-${a.slug}`,
    current_level: null, current_domain: a.vendor,
    summary: (a.problem?.en || "").slice(0, 240),
    learning_objective: a.whenThisShape?.en || "",
    actual_user_action: "read",
    estimated_minutes: minutes(words([a.problem?.en, a.whenThisShape?.en, ...(a.flow || []).map((f) => f.en)].join(" ")), 0),
    prerequisites: [], related_concepts: [],
    primary_sources: a.source ? [a.source] : [],
    images: a.diagram ? [`schematic:${a.diagram.kind}`] : [],
    interactive_elements: [],
    assessment: { checks: 0, checkKinds: [], checkpoints: [], builds: [] },
    language_quality_en: { words: words(a.problem?.en) },
    language_quality_es: { words: words(a.problem?.es), flags: esSignals(a.problem?.es) },
    technical_accuracy_status: a.source ? "sourced" : "UNSOURCED",
    content_depth: (a.tradeoffs || []).length + (a.failureModes || []).length,
    cognitive_load: words(a.problem?.en),
    duplication_candidates: [],
    target_route: "shared-foundations", target_stage: null, target_type: "architecture",
    recommended_action: "KEEP",
    migration_notes: "Vendor-sourced reference shape; needs the §38.3 view split when promoted.",
    confidence: "high", _resources: [], _layers: [],
    _prose: [a.problem?.en, a.whenThisShape?.en, ...(a.tradeoffs || []).map((x) => x.en)].filter(Boolean).join(" "),
  });
}

// ── 4. Checkpoints ───────────────────────────────────────────────────────────
for (const cp of curriculum.checkpoints) {
  const route = ROUTE_OF_DOMAIN[cp.domainId];
  const stems = cp.items.map((i) => i.stem?.en || "").join(" ");
  push({
    id: `checkpoint:${cp.id}`,
    title_en: `${cp.domainId} ${cp.afterLevel} checkpoint`, title_es: `Checkpoint ${cp.domainId} ${cp.afterLevel}`,
    current_type: "checkpoint",
    current_route: `/[locale]/checkpoint/${cp.id}`,
    current_level: cp.afterLevel, current_domain: cp.domainId,
    summary: `${cp.items.length} graded judgment items over ${cp.coversConcepts.length} concepts`,
    learning_objective: "Demonstrate the level's judgment before ascending",
    actual_user_action: "graded-decision",
    estimated_minutes: cp.items.length * 2,
    prerequisites: cp.coversConcepts, related_concepts: [],
    primary_sources: [], images: [], interactive_elements: [],
    assessment: { checks: cp.items.length, checkKinds: ["mcq"], checkpoints: [cp.id], builds: [] },
    language_quality_en: { words: words(stems) },
    language_quality_es: { words: words(cp.items.map((i) => i.stem?.es || "").join(" ")), flags: esSignals(cp.items.map((i) => i.stem?.es || "").join(" ")) },
    technical_accuracy_status: "sourced-via-concepts",
    content_depth: cp.items.length,
    cognitive_load: words(stems),
    duplication_candidates: [],
    target_route: route, target_stage: STAGE_OF[route][cp.afterLevel],
    target_type: "capability-checkpoint",
    recommended_action: null, migration_notes: "", confidence: "high",
    _resources: [], _layers: [], _prose: stems,
  });
}

// ── 5. Build Lab challenges ──────────────────────────────────────────────────
for (const b of builds) {
  push({
    id: `build:${b.id}`,
    title_en: b.title?.en || "", title_es: b.title?.es || "",
    current_type: "build-challenge",
    current_route: `/[locale]/build#${b.id}`,
    current_level: null, current_domain: b.track,
    summary: (b.prompt?.en || "").slice(0, 240),
    learning_objective: b.prompt?.en || "",
    actual_user_action: "assemble-architecture",
    estimated_minutes: 8,
    prerequisites: [b.concept], related_concepts: [b.concept],
    primary_sources: [], images: [], interactive_elements: ["architect-builder"],
    assessment: { checks: 1, checkKinds: ["build"], checkpoints: [], builds: [b.id] },
    language_quality_en: { words: words(b.prompt?.en) },
    language_quality_es: { words: words(b.prompt?.es), flags: esSignals(b.prompt?.es) },
    technical_accuracy_status: "graded-topology",
    content_depth: (b.requiredNodes || []).length + (b.requiredEdges || []).length + (b.forbiddenEdges || []).length,
    cognitive_load: words(b.prompt?.en),
    duplication_candidates: [],
    target_route: ROUTE_OF_DOMAIN[lessonByConcept.get(b.concept) ? findDomain(b.concept) : "ai-engineering"] || "shared-foundations",
    target_stage: null, target_type: "lab",
    recommended_action: "KEEP", migration_notes: "Already a §6.4 Architecture Assembly lab.",
    confidence: "high", _resources: [], _layers: [], _prose: b.prompt?.en || "",
  });
}
function findDomain(slug) {
  for (const d of curriculum.domains) for (const lv of d.levels) if (lv.concepts.some((c) => c.slug === slug)) return d.id;
  return "ai-engineering";
}

// ── 6. Reading list resources ────────────────────────────────────────────────
for (const r of resources) {
  push({
    id: `resource:${r.id}`,
    title_en: r.title || "", title_es: r.title || "",
    current_type: "reading-resource",
    current_route: `/[locale]/resources#${r.id}`,
    current_level: (r.levels || [])[0] || null, current_domain: r.domainId || null,
    summary: (r.why?.en || r.why || "").toString().slice(0, 240),
    learning_objective: (r.why?.en || r.why || "").toString(),
    actual_user_action: "open-external",
    estimated_minutes: 0,
    prerequisites: [], related_concepts: r.concepts || [],
    primary_sources: [r.url],
    images: [], interactive_elements: [],
    assessment: { checks: 0, checkKinds: [], checkpoints: [], builds: [] },
    language_quality_en: { words: words(r.why?.en || r.why) },
    language_quality_es: { words: words(r.why?.es), flags: esSignals(r.why?.es) },
    technical_accuracy_status: r.verified ? "link-verified" : "UNVERIFIED",
    content_depth: (r.concepts || []).length,
    cognitive_load: 0,
    duplication_candidates: [],
    target_route: ROUTE_OF_DOMAIN[r.domainId] || "shared-foundations",
    target_stage: null, target_type: "source",
    recommended_action: null, migration_notes: "", confidence: "high",
    _resources: [], _layers: [], _prose: (r.why?.en || r.why || "").toString(),
  });
}

// ── 7. Legacy diagnostic modules (ai-l5 / general-l5) ────────────────────────
for (const [file, blob, track] of [["ai-l5.json", aiL5, "ai"], ["general-l5.json", generalL5, "general"]]) {
  for (const m of blob.modules || []) {
    const body = (m.topics || []).map((t) => t.body?.en || "").join(" ");
    push({
      id: `module:${m.id}`,
      title_en: m.title?.en || "", title_es: m.title?.es || "",
      current_type: "legacy-module",
      current_route: `/[locale]/module/${m.id}`,
      current_level: m.level, current_domain: m.axis?.primary || track,
      summary: (m.tagline?.en || "").slice(0, 240),
      learning_objective: m.tagline?.en || "",
      actual_user_action: "read+mcq",
      estimated_minutes: minutes(words(body), 0),
      prerequisites: m.prerequisites || [], related_concepts: [],
      primary_sources: [], images: (m.topics || []).filter((t) => t.diagram).map((t) => `diagram:${t.diagram}`),
      interactive_elements: [],
      assessment: { checks: (m.retrieval || []).length, checkKinds: ["cbm-mcq"], checkpoints: [], builds: [] },
      language_quality_en: { words: words(body), ...contractMarks(body) },
      language_quality_es: { words: words((m.topics || []).map((t) => t.body?.es || "").join(" ")), flags: esSignals((m.topics || []).map((t) => t.body?.es || "").join(" ")) },
      technical_accuracy_status: "legacy-fleet-authored",
      content_depth: (m.topics || []).length,
      cognitive_load: words(body),
      duplication_candidates: [],
      target_route: ROUTE_OF_DOMAIN[m.axis?.primary] || (track === "ai" ? "ai-architect" : "staff-engineer"),
      target_stage: null, target_type: null,
      recommended_action: null,
      migration_notes: `Source file ${file}. Predates the spine; overlaps it by topic.`,
      confidence: "medium", _resources: [], _layers: [], _prose: body,
    });
  }
}

// ── Duplication detection ────────────────────────────────────────────────────
// Compares AUTHORED prose only. The first version of this compared `title_en +
// summary`, and for checkpoints those two fields are strings this script itself
// synthesizes ("technical-depth L4 checkpoint" / "N graded items over M
// concepts") — so it reported 595 "duplicate pairs", 100% of them checkpoints
// matching each other on my own template. A duplication signal computed from
// generated labels measures the generator, not the content.
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3);
const STOP = new Set(["that", "this", "with", "when", "your", "from", "what", "which", "into", "than", "then", "does", "have", "each", "them", "they", "will", "more", "most", "same", "also", "both", "over", "under", "about", "concepts", "checkpoint", "graded", "judgment", "items"]);
const shingle = (s) => new Set(norm(s).filter((w) => !STOP.has(w)));
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
/** The authored text that defines a unit — never a label this script builds. */
function dupText(r) {
  switch (r.current_type) {
    case "spine-concept":
    case "codex-entry":
    case "reference-architecture":
    case "legacy-module":
      return `${r.title_en} ${r.learning_objective} ${r._prose || ""}`;
    case "build-challenge":
      return `${r.title_en} ${r.learning_objective}`;
    case "reading-resource":
      return `${r.title_en} ${r.learning_objective}`;
    // Checkpoints have no authored title or summary of their own — their content
    // is the item stems. Compare those, or nothing.
    case "checkpoint":
      return r._prose || "";
    default:
      return "";
  }
}
const sig = rows.map((r) => shingle(dupText(r)));
// A unit with too little authored text to characterise cannot honestly be called
// a duplicate of anything — skip it rather than match it on stopwords.
const MIN_TOKENS = 12;
for (let i = 0; i < rows.length; i++) {
  if (sig[i].size < MIN_TOKENS) continue;
  for (let j = i + 1; j < rows.length; j++) {
    if (sig[j].size < MIN_TOKENS) continue;
    const s = jaccard(sig[i], sig[j]);
    if (s >= 0.42) {
      rows[i].duplication_candidates.push({ id: rows[j].id, similarity: +s.toFixed(3) });
      rows[j].duplication_candidates.push({ id: rows[i].id, similarity: +s.toFixed(3) });
    }
  }
}

// ── Classification (§7 rules → recommended_action + target_type) ─────────────
// Deterministic, and every branch traces to a rule in the prompt's §7.
function classify(r) {
  if (r.recommended_action) return; // already fixed above

  if (r.current_type === "checkpoint") {
    r.target_type = "capability-checkpoint";
    // §16 "checkpoints must evaluate capability bundles" — a bank that is only
    // MCQ over one level is not a bundle yet.
    r.recommended_action = "REWRITE";
    r.migration_notes = "Keep the id and the item bank; add a diagnose/design/transfer stage so the gate measures a bundle, not recall of one level.";
    return;
  }
  if (r.current_type === "reading-resource") {
    r.target_type = "source";
    // §6.7 — a link with a `why` but no question/difficulty/prereqs is still a
    // deposit of links.
    r.recommended_action = "REWRITE";
    r.migration_notes = "Add question answered, difficulty, prerequisites, relevant section, essential/deep-dive state.";
    return;
  }
  if (r.current_type === "legacy-module") {
    const dup = r.duplication_candidates.some((d) => d.id.startsWith("concept:"));
    r.target_type = dup ? "archived" : "practice";
    r.recommended_action = dup ? "ARCHIVE" : "CONVERT_TO_PRACTICE";
    r.migration_notes = dup
      ? "Superseded by the spine concept it duplicates; keep the id as a redirect and preserve its CBM item bank for Practice."
      : "Its value is its CBM item bank and Rooms, not its prose; the spine teaches the same ground.";
    return;
  }

  // Spine concepts — §7's actual decision table.
  const en = r.language_quality_en;
  const hasDecision = r.assessment.checks > 0 || r.assessment.builds.length > 0;
  const isDefinitional = en.words > 0 && en.words < 180 && r.content_depth <= 2;
  const shared = r.target_route === "shared-foundations";

  if (r.current_route === "(unreachable)") {
    r.target_type = "codex";
    r.recommended_action = "NEEDS_RESEARCH";
    r.migration_notes = "Concept is in the spine but has no lesson pane — unreachable content.";
    return;
  }
  if (isDefinitional) {
    r.target_type = "codex";
    r.recommended_action = "DEMOTE_TO_CODEX";
    r.migration_notes = "Short, definitional, no layered depth — §7 says this is reference, not a lesson.";
    return;
  }
  if (shared) {
    r.target_type = "shared-foundation";
    r.recommended_action = "CONVERT_TO_SHARED_FOUNDATION";
    r.migration_notes = "Appears in both routes' prerequisite closure; canonical definition in Codex, application per route.";
    return;
  }
  if (!hasDecision) {
    r.target_type = "learn-session";
    r.recommended_action = "REWRITE";
    r.migration_notes = "Teaches without ever asking the learner to decide — §2.3 blocks progress on reading alone.";
    return;
  }
  r.target_type = "learn-session";
  r.recommended_action = r.content_depth >= 6 && en.words > 520 ? "SPLIT" : "KEEP";
  if (r.recommended_action === "SPLIT") {
    r.migration_notes = "Over the §6.2 first-screen budget: split into an encounter session and a depth layer.";
  }
}
rows.forEach(classify);

// ── Emit ─────────────────────────────────────────────────────────────────────
const byType = {};
for (const r of rows) byType[r.current_type] = (byType[r.current_type] || 0) + 1;
const byAction = {};
for (const r of rows) byAction[r.recommended_action] = (byAction[r.recommended_action] || 0) + 1;
const byRoute = {};
for (const r of rows) byRoute[r.target_route] = (byRoute[r.target_route] || 0) + 1;

const summary = {
  generated_by: "tools/inventory.cjs",
  total_units: rows.length,
  by_current_type: byType,
  by_recommended_action: byAction,
  by_target_route: byRoute,
  unsourced: rows.filter((r) => r.technical_accuracy_status === "UNSOURCED" || r.technical_accuracy_status === "UNVERIFIED").length,
  unreachable: rows.filter((r) => r.current_route === "(unreachable)").length,
  concepts_without_decision: rows.filter((r) => r.current_type === "spine-concept" && r.assessment.checks === 0 && r.assessment.builds.length === 0).length,
  concepts_without_interactive: rows.filter((r) => r.current_type === "spine-concept" && r.interactive_elements.length === 0).length,
  es_flagged: rows.filter((r) => (r.language_quality_es.flags || []).some((f) => f !== undefined && f !== "")).length,
  duplication_pairs: rows.reduce((n, r) => n + r.duplication_candidates.length, 0) / 2,
};

if (process.argv.includes("--summary")) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
const clean = rows.map(({ _resources, _layers, _prose, ...r }) => ({ ...r, resources: _resources, depth_layers: _layers }));
fs.writeFileSync(path.join(OUT, "content-inventory.json"), JSON.stringify({ summary, units: clean }, null, 1));

// CSV — flat, one row per unit, arrays joined with `|`.
const COLS = ["id", "title_en", "title_es", "current_type", "current_route", "current_level", "current_domain", "learning_objective", "actual_user_action", "estimated_minutes", "prerequisites", "related_concepts", "primary_sources", "images", "interactive_elements", "technical_accuracy_status", "content_depth", "cognitive_load", "duplication_candidates", "target_route", "target_stage", "target_type", "recommended_action", "migration_notes", "confidence"];
const cell = (v) => {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.map((x) => (typeof x === "object" ? x.id || JSON.stringify(x) : x)).join("|") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
fs.writeFileSync(
  path.join(OUT, "content-inventory.csv"),
  [COLS.join(","), ...clean.map((r) => COLS.map((c) => cell(r[c])).join(","))].join("\n")
);

const tbl = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join("\n");
fs.writeFileSync(path.join(OUT, "01-content-inventory.md"), `# 01 — Content inventory

> Generated by \`node tools/inventory.cjs\`. **Do not edit by hand.** Every count
> in the other transformation documents traces back to this run, because the
> prompt forbids invented quantities.

## Totals

**${rows.length} learner-facing units** across ${Object.keys(byType).length} content types.

| Current type | Units |
|---|---|
${tbl(byType)}

## Where each unit is headed

| Target route | Units |
|---|---|
${tbl(byRoute)}

| Recommended action | Units |
|---|---|
${tbl(byAction)}

## Findings the numbers force

| Signal | Count | Why it matters |
|---|---|---|
| Units with no verifiable source | ${summary.unsourced} | §14 — a claim without a source cannot be maintained. |
| Spine concepts with no lesson pane | ${summary.unreachable} | Unreachable content: in the spine, never rendered. |
| Spine concepts that never ask for a decision | ${summary.concepts_without_decision} | §2.3 — reading is not progress. |
| Spine concepts with no interactive element | ${summary.concepts_without_interactive} | §2.7 — decorative art cannot stand in for a diagram. |
| Near-duplicate unit pairs (Jaccard ≥ 0.42) | ${summary.duplication_pairs} | §7 — duplicates get archived with a record. |

Machine-readable: \`content-inventory.json\`, \`content-inventory.csv\`.
Per-pair duplication detail: \`duplication-map.md\`.
`);

console.log(`✓ inventory: ${rows.length} units → docs/transformation/{01-content-inventory.md,content-inventory.json,content-inventory.csv}`);
console.log(JSON.stringify(summary, null, 1));
