#!/usr/bin/env node
/**
 * Validating merge of authored Codex clusters + architectures into
 * src/content/data/codex.json.
 *
 * Same reason merge-lessons.cjs exists: content-as-data arrives from a fleet of
 * agents, and raw agent JSON must never reach a shipped data file. This script is
 * strict and never partially writes — any error aborts the whole merge, so the
 * shipped file is always either the old one or a fully valid new one.
 *
 * What it enforces, and why each rule is here:
 *   • Bilingual everywhere, es ≠ en, no banned calques (reuses merge-lessons'
 *     validator so the two can't drift).
 *   • The six-part entry anatomy is COMPLETE. An entry that cannot state its cost
 *     and its cheaper alternative is one we do not understand well enough to ship,
 *     so a missing `cost`/`cheaperFirst` is an error rather than a warning.
 *   • `cost` may not be an adjective. "more reliable" is the exact failure the
 *     writing contract was created to stop; a cost is a bound or a figure.
 *   • Diagram shape matches its `kind` — a mismatch renders EMPTY, which is the
 *     single most expensive silent defect in this codebase's history.
 *   • `compare` diagrams have symmetric sides. Three quantified points against
 *     one hedge reads as a tradeoff and teaches nothing.
 *   • The entry DAG is acyclic and every prerequisite resolves. A cycle would
 *     make the derived reading path meaningless.
 *   • `relatedConcepts` point at REAL spine slugs. A dead cross-link is worse
 *     than no cross-link: it promises depth that isn't there.
 *   • `source` is a plausible fetched URL. Every entry must be checkable.
 *   • Banned words / shapes from the writing contract, in both locales.
 *
 * Usage: node tools/merge-codex.cjs research/codex/*.json
 *        node tools/merge-codex.cjs --check          # validate what's shipped
 *        node tools/merge-codex.cjs --dry-run <files>
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const CODEX = path.join(ROOT, "src/content/data/codex.json");
const SPINE = path.join(ROOT, "src/content/data/curriculum.json");
const VIZ = path.join(ROOT, "src/components/viz/index.ts");

const errs = [];
const warns = [];
const bad = (m) => errs.push(m);

// ── Bilingual + calque validation (mirrors merge-lessons.cjs) ─────────────

const BANNED_ES = new RegExp([
  "\\blibrer[íi]as?\\b",
  "\\brobust[oa]s?\\b",
  "\\brobustez\\b",
  "\\bcorrectitud\\b",
  "\\beventualmente\\b(?!\\s+consistente)",
].join("|"), "iu");

/** Words the writing contract bans outright, in either locale. */
const BANNED_WORDS = /\b(leverage[sd]?|leveraging|robust(ly|ness)?|harness(es|ing)?|crucial(ly)?|seamless(ly)?|cutting-edge|game-chang\w+|delve[sd]?|delving|showcase[sd]?|showcasing|pivotal|intricate|intricacies|meticulous(ly)?|realms?|embark[s]?|tapestry|plethora|myriad|furthermore|moreover|comprehensive)\b/i;
const BANNED_PHRASES = /(best practices?|it'?s important to note|it is important to note|in today'?s|at the end of the day|when it comes to|not just\b[^.!?]{0,80}\bbut\b|not only\b[^.!?]{0,80}\bbut also\b|\b(serves|functions|acts) as\b|\bThe (judgment|judgement) (is|call is)\b)/i;

/**
 * A `cost` that is only an adjective.
 *
 * The contract's rule 4: state a bound or a figure, never "more reliable". This
 * catches the common shape — a cost field with no number, no unit, and no named
 * resource. Deliberately permissive about HOW the bound is expressed (a fraction,
 * a latency, a named resource like "duplicated capacity"), because over-tight
 * matching here would reject correct content and train people to bypass the gate.
 */
const COST_IS_CONCRETE = /(\d|1\/N|per-|per |latency|throughput|capacity|memory|storage|bytes?|tokens?|dimensions?|recall|precision|coverage|requests?|seconds?|minutes?|hours?|days?|money|dollars?|\$|%|x\b|ms\b|GB\b|reversib|migration|operational surface|headcount|engineer|quota|trad(e|ing) \w+ for|in exchange for|at the cost of)/i;

/**
 * Fields where a list of figures is the POINT, so the punctuation cap does not apply.
 *
 * `numbers` is deliberately an enumeration — "pgvector m=16, ef_construction=64;
 * Qdrant m=16, ef_construct=100; Milvus M=30" is the correct way to write three
 * engines' defaults, and semicolons are what separate them. The em-dash and
 * semicolon caps exist to stop rhetorical flooding in PROSE; applying them to a
 * figures list rejects correct content, and a gate that fires on correct content
 * trains people to bypass the validator. That lesson is already written into
 * tools/merge-lessons.cjs, so it is honoured here rather than relearned.
 */
const PUNCTUATION_EXEMPT = /\.numbers$/;

const isI18n = (v) => !!v && typeof v.en === "string" && typeof v.es === "string";

function checkI18n(v, where, { min = 1, optional = false, sameOk = false } = {}) {
  if (v === undefined || v === null) { if (!optional) bad(`${where}: missing`); return; }
  if (!isI18n(v)) return bad(`${where}: not an {en,es} object`);
  const en = v.en.trim(), es = v.es.trim();
  if (!en || !es) return bad(`${where}: empty en or es`);
  if (en.length < min) bad(`${where}: en too short (${en.length} < ${min} chars)`);
  if (!sameOk && en === es) bad(`${where}: es is untranslated (identical to en)`);
  if (BANNED_ES.test(es)) bad(`${where}: banned calque in es`);
  for (const [loc, text] of [["en", en], ["es", es]]) {
    const w = BANNED_WORDS.exec(text);
    if (w) bad(`${where}.${loc}: banned word "${w[1]}"`);
    const p = BANNED_PHRASES.exec(text);
    if (p) bad(`${where}.${loc}: banned phrase/shape "${p[0].slice(0, 40)}"`);
    // Max one em-dash and one semicolon per PROSE field — the corpus this
    // replaces averaged 3.5 em-dashes per concept. A figures list is exempt.
    if (!PUNCTUATION_EXEMPT.test(where)) {
      if ((text.match(/—/g) || []).length > 1) bad(`${where}.${loc}: more than one em-dash`);
      if ((text.match(/;/g) || []).length > 1) bad(`${where}.${loc}: more than one semicolon`);
    }
  }
}

/** Short label-ish fields where an untranslated technical term is legitimate. */
const TERMISH = { sameOk: true };

function widgetIds() {
  const src = fs.readFileSync(VIZ, "utf8");
  const body = src.slice(src.indexOf("WIDGETS"), src.indexOf("WIDGET_IDS"));
  return new Set([...body.matchAll(/"([a-z0-9-]+)":/g)].map((m) => m[1]));
}

function spineSlugs() {
  const spine = JSON.parse(fs.readFileSync(SPINE, "utf8"));
  const out = new Set();
  for (const d of spine.domains) for (const b of d.levels) for (const c of b.concepts) out.add(c.slug);
  return out;
}

/** Diagram: the renderer keys off `kind`, so a shape mismatch renders nothing. */
function checkSchematic(s, where, { required = false } = {}) {
  if (s === undefined || s === null) {
    if (required) bad(`${where}: missing`);
    return;
  }
  const kinds = ["flow", "compare", "stack", "axes", "none"];
  if (!kinds.includes(s.kind)) return bad(`${where}: bad kind "${s.kind}"`);
  if (s.kind === "none") return;
  checkI18n(s.caption, `${where}.caption`);
  if (s.kind === "flow" || s.kind === "stack") {
    if (!Array.isArray(s.nodes) || s.nodes.length < 3) bad(`${where}: kind ${s.kind} needs ≥3 nodes`);
    if (Array.isArray(s.nodes) && s.nodes.length > 6) bad(`${where}: kind ${s.kind} has ${s.nodes.length} nodes (max 6 stays legible on a phone)`);
    for (const [i, n] of (s.nodes ?? []).entries()) {
      checkI18n(n.label, `${where}.nodes[${i}].label`, TERMISH);
      checkI18n(n.note, `${where}.nodes[${i}].note`, { optional: true, sameOk: true });
    }
    if (s.left || s.right) bad(`${where}: kind ${s.kind} must not carry left/right (renders nothing)`);
  } else if (s.kind === "compare") {
    for (const side of ["left", "right"]) {
      const c = s[side];
      if (!c) { bad(`${where}: kind compare needs ${side}`); continue; }
      checkI18n(c.title, `${where}.${side}.title`, TERMISH);
      if (!Array.isArray(c.points) || c.points.length < 2) bad(`${where}.${side}: needs ≥2 points`);
      if (Array.isArray(c.points) && c.points.length > 5) bad(`${where}.${side}: ${c.points.length} points (max 5)`);
      for (const [i, p] of (c.points ?? []).entries()) checkI18n(p, `${where}.${side}.points[${i}]`);
    }
    // Asymmetric sides are the documented failure mode of comparison content:
    // three quantified points against one hedge reads as a tradeoff and teaches
    // nothing. Symmetry is checkable, so it is enforced rather than reviewed.
    const L = s.left?.points?.length ?? 0, R = s.right?.points?.length ?? 0;
    if (L && R && L !== R) bad(`${where}: compare sides are asymmetric (left ${L}, right ${R})`);
    if (s.nodes) bad(`${where}: kind compare must not carry nodes`);
  } else if (s.kind === "axes") {
    checkI18n(s.xAxis, `${where}.xAxis`, TERMISH);
    checkI18n(s.yAxis, `${where}.yAxis`, TERMISH);
  }
}

const URLISH = /^https?:\/\/[^\s]+\.[^\s]+/;

function checkEntry(e, where, ids, spine) {
  if (typeof e.slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(e.slug)) {
    bad(`${where}: slug "${e.slug}" must be kebab-case`);
  }
  checkI18n(e.term, `${where}.term`, TERMISH);
  // The definition is the ONE line that must not presume the concept. Capped
  // because a 60-word "definition" is an explanation wearing a definition's name.
  checkI18n(e.definition, `${where}.definition`, { min: 20 });
  const defWords = (e.definition?.en ?? "").trim().split(/\s+/).length;
  if (defWords > 34) bad(`${where}.definition: ${defWords} words (max ~30 — it is a definition, not an explanation)`);
  checkI18n(e.howItWorks, `${where}.howItWorks`, { min: 60 });
  checkI18n(e.whenToUse, `${where}.whenToUse`, { min: 25 });
  checkI18n(e.cost, `${where}.cost`, { min: 15 });
  checkI18n(e.cheaperFirst, `${where}.cheaperFirst`, { min: 25 });
  checkI18n(e.failureMode, `${where}.failureMode`, { min: 25 });
  checkI18n(e.numbers, `${where}.numbers`, { optional: true, sameOk: true });

  // The editorial position, enforced: a cost is a bound or a figure.
  if (e.cost?.en && !COST_IS_CONCRETE.test(e.cost.en)) {
    bad(`${where}.cost: no bound, figure or named resource — "${e.cost.en.slice(0, 60)}". A cost is not an adjective.`);
  }

  if (typeof e.source !== "string" || !URLISH.test(e.source)) {
    bad(`${where}.source: "${e.source}" is not a fetchable URL — every entry must be checkable`);
  }

  checkSchematic(e.diagram, `${where}.diagram`);

  if (!Array.isArray(e.prerequisites)) bad(`${where}.prerequisites: must be an array (use [] for none)`);
  if (!Array.isArray(e.relatedConcepts)) bad(`${where}.relatedConcepts: must be an array (use [] for none)`);
  // A dead cross-link promises depth that isn't there, so it is an error.
  for (const c of e.relatedConcepts ?? []) {
    if (!spine.has(c)) bad(`${where}.relatedConcepts: "${c}" is not a concept slug in the spine`);
  }
  if (e.visual && !ids.has(e.visual.widgetId)) {
    bad(`${where}.visual: unknown widgetId "${e.visual.widgetId}"`);
  }
}

function checkArchitecture(a, where) {
  if (typeof a.slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(a.slug)) bad(`${where}: slug must be kebab-case`);
  checkI18n(a.name, `${where}.name`, TERMISH);
  checkI18n(a.problem, `${where}.problem`, { min: 25 });
  checkI18n(a.whenThisShape, `${where}.whenThisShape`, { min: 25 });
  if (!Array.isArray(a.components) || a.components.length < 3 || a.components.length > 8) {
    bad(`${where}.components: needs 3-8 (got ${a.components?.length})`);
  }
  for (const [i, c] of (a.components ?? []).entries()) {
    checkI18n(c.label, `${where}.components[${i}].label`, TERMISH);
    checkI18n(c.role, `${where}.components[${i}].role`);
  }
  if (!Array.isArray(a.flow) || a.flow.length < 3) bad(`${where}.flow: needs ≥3 ordered steps`);
  for (const [i, f] of (a.flow ?? []).entries()) checkI18n(f, `${where}.flow[${i}]`);
  // Two each, because one tradeoff is an opinion and one failure mode is a caveat.
  if (!Array.isArray(a.tradeoffs) || a.tradeoffs.length < 2) bad(`${where}.tradeoffs: needs ≥2`);
  for (const [i, t] of (a.tradeoffs ?? []).entries()) checkI18n(t, `${where}.tradeoffs[${i}]`);
  if (!Array.isArray(a.failureModes) || a.failureModes.length < 2) bad(`${where}.failureModes: needs ≥2`);
  for (const [i, f] of (a.failureModes ?? []).entries()) checkI18n(f, `${where}.failureModes[${i}]`);
  if (typeof a.source !== "string" || !URLISH.test(a.source)) {
    bad(`${where}.source: not a fetchable URL — a redrawn architecture must name the doc it came from`);
  }
  if (!["aws", "gcp", "azure", "anthropic", "other"].includes(a.vendor)) {
    bad(`${where}.vendor: "${a.vendor}" not one of aws|gcp|azure|anthropic|other`);
  }
  checkSchematic(a.diagram, `${where}.diagram`, { required: true });
  if (a.diagram && a.diagram.kind !== "flow") {
    bad(`${where}.diagram: an architecture is a flow (got "${a.diagram.kind}")`);
  }
}

/** The whole codex: cross-entry invariants the per-entry checks can't see. */
function checkCodex(codex, ids, spine) {
  const seenEntry = new Map();
  const seenCluster = new Set();

  for (const [ci, c] of (codex.clusters ?? []).entries()) {
    const cw = `clusters[${ci}]${c.slug ? `(${c.slug})` : ""}`;
    if (typeof c.slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(c.slug)) bad(`${cw}: slug must be kebab-case`);
    if (seenCluster.has(c.slug)) bad(`${cw}: duplicate cluster slug`);
    seenCluster.add(c.slug);
    checkI18n(c.title, `${cw}.title`, TERMISH);
    checkI18n(c.tagline, `${cw}.tagline`, { min: 20 });
    if (!Array.isArray(c.entries) || c.entries.length < 3) bad(`${cw}.entries: needs ≥3`);
    for (const e of c.entries ?? []) {
      const ew = `${c.slug}/${e.slug}`;
      // A slug reused across clusters would make ENTRY_BY_SLUG lose one silently.
      if (seenEntry.has(e.slug)) bad(`${ew}: duplicate entry slug (also in ${seenEntry.get(e.slug)})`);
      seenEntry.set(e.slug, c.slug);
      checkEntry(e, ew, ids, spine);
    }
  }

  // Prerequisites must resolve, and the DAG must be acyclic — the derived reading
  // path is meaningless otherwise, and codexPath() would silently flatten a cycle.
  const all = new Set(seenEntry.keys());
  const byslug = new Map();
  for (const c of codex.clusters ?? []) for (const e of c.entries ?? []) byslug.set(e.slug, e);
  for (const [slug, e] of byslug) {
    for (const p of e.prerequisites ?? []) {
      if (!all.has(p)) bad(`${slug}.prerequisites: "${p}" is not an entry in the codex`);
      if (p === slug) bad(`${slug}.prerequisites: names itself`);
    }
  }
  // DFS cycle detection, reporting the actual cycle so it is fixable.
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map([...all].map((s) => [s, WHITE]));
  const stack = [];
  const visit = (s) => {
    color.set(s, GREY);
    stack.push(s);
    for (const p of byslug.get(s)?.prerequisites ?? []) {
      if (!all.has(p)) continue;
      const cl = color.get(p);
      if (cl === GREY) bad(`prerequisite cycle: ${[...stack.slice(stack.indexOf(p)), p].join(" → ")}`);
      else if (cl === WHITE) visit(p);
    }
    stack.pop();
    color.set(s, BLACK);
  };
  for (const s of all) if (color.get(s) === WHITE) visit(s);

  const archSlugs = new Set();
  for (const [ai, a] of (codex.architectures ?? []).entries()) {
    if (archSlugs.has(a.slug)) bad(`architectures[${ai}]: duplicate slug "${a.slug}"`);
    archSlugs.add(a.slug);
    checkArchitecture(a, `arch/${a.slug ?? ai}`);
  }

  return { entries: all.size, clusters: seenCluster.size, architectures: archSlugs.size };
}

// ── Cluster assembly from micro-batches ───────────────────────────────────

/**
 * Which cluster each authored micro-batch belongs to, and the cluster's own
 * bilingual title and tagline.
 *
 * This map is the reference's TABLE OF CONTENTS, and it lives in the merge script
 * on purpose. The fleet writes 4-5 entries per file because a 10-entry bilingual
 * cluster does not fit in one agent response; but "which cluster is this, and what
 * is the cluster called" is an editorial decision about the shape of the whole
 * reference, and it must not be re-decided by whichever agent happened to write
 * the batch. Prefix, not exact filename, so a follow-up `ck-4` lands correctly.
 *
 * The tagline states what the cluster lets you DECIDE. A cluster whose tagline is
 * a topic label ("all about chunking") is a cluster we have not thought about.
 */
const BATCH_CLUSTER = [
  {
    prefix: "ck", slug: "chunking",
    title: { en: "Chunking", es: "Chunking" },
    tagline: {
      en: "How you cut a document decides what retrieval can ever find. Pick the cut, then pay for it.",
      es: "Cómo cortas un documento decide qué podrá encontrar la recuperación. Elige el corte y luego págalo.",
    },
  },
  {
    prefix: "em", slug: "embeddings",
    title: { en: "Embeddings", es: "Embeddings" },
    tagline: {
      en: "What a vector encodes, and what you give up each time you make one cheaper.",
      es: "Qué codifica un vector y qué cedes cada vez que lo haces más barato.",
    },
  },
  {
    prefix: "ix", slug: "vector-indexes",
    title: { en: "Vector indexes", es: "Índices vectoriales" },
    tagline: {
      en: "Every index trades recall for latency or memory. Knowing which one it trades is the whole skill.",
      es: "Todo índice cambia recall por latencia o memoria. Saber cuál de los dos cede es la habilidad completa.",
    },
  },
  {
    prefix: "rk", slug: "retrieval-ranking",
    title: { en: "Retrieval and ranking", es: "Recuperación y ranking" },
    tagline: {
      en: "Most RAG failures are retrieval failures. These are the moves that fix them, and what each costs.",
      es: "La mayoría de las fallas de RAG son fallas de recuperación. Estas son las jugadas que las arreglan y qué cuesta cada una.",
    },
  },
  {
    prefix: "ev", slug: "evaluation",
    title: { en: "Evaluation", es: "Evaluación" },
    tagline: {
      en: "You cannot improve what you have not separated: measure retrieval and generation apart.",
      es: "No puedes mejorar lo que no has separado: mide la recuperación y la generación por separado.",
    },
  },
  {
    prefix: "cx", slug: "context-engineering",
    title: { en: "Context engineering", es: "Ingeniería de contexto" },
    tagline: {
      en: "The context window is a budget, not storage. Everything here is a way to spend it deliberately.",
      es: "La ventana de contexto es un presupuesto, no almacenamiento. Todo aquí es una forma de gastarlo a propósito.",
    },
  },
  {
    prefix: "ag", slug: "agent-patterns",
    title: { en: "Agent patterns", es: "Patrones de agentes" },
    tagline: {
      en: "Start with the simplest shape that works. Each step up in autonomy buys capability and costs predictability.",
      es: "Empieza con la forma más simple que funcione. Cada paso hacia más autonomía compra capacidad y cuesta previsibilidad.",
    },
  },
  {
    prefix: "to", slug: "tools-integration",
    title: { en: "Tools and integration", es: "Herramientas e integración" },
    tagline: {
      en: "A tool the model cannot use correctly is a tool you do not have. The description is the interface.",
      es: "Una herramienta que el modelo no puede usar bien es una herramienta que no tienes. La descripción es la interfaz.",
    },
  },
  {
    prefix: "sv", slug: "serving",
    title: { en: "Serving and performance", es: "Servicio y rendimiento" },
    tagline: {
      en: "Time-to-first-token, tokens-per-second and cost pull in different directions. You choose two.",
      es: "El tiempo al primer token, los tokens por segundo y el costo tiran en direcciones distintas. Eliges dos.",
    },
  },
  {
    prefix: "se", slug: "security",
    title: { en: "Security and guardrails", es: "Seguridad y barreras" },
    tagline: {
      en: "Prompt injection is not a prompting problem. What actually contains it is the shape of your permissions.",
      es: "La inyección de prompts no es un problema de prompting. Lo que de verdad la contiene es la forma de tus permisos.",
    },
  },
  {
    prefix: "ms", slug: "model-strategy",
    title: { en: "Model strategy", es: "Estrategia de modelos" },
    tagline: {
      en: "Prompt, retrieve, fine-tune or distil — the decision has a checkable rule, not a preference.",
      es: "Prompt, recuperar, ajustar o destilar: la decisión tiene una regla verificable, no una preferencia.",
    },
  },
];

/** Cluster order in the shipped file follows BATCH_CLUSTER, so browse order is
 *  an editorial sequence rather than whatever order the fleet finished in. */
function clusterForBatch(basename) {
  const prefix = basename.split("-")[0];
  return BATCH_CLUSTER.find((c) => c.prefix === prefix) ?? null;
}

/** Sort clusters into the authored order, and entries by their batch sequence. */
function sortCodex(codex) {
  const rank = new Map(BATCH_CLUSTER.map((c, i) => [c.slug, i]));
  codex.clusters.sort(
    (a, b) => (rank.get(a.slug) ?? 999) - (rank.get(b.slug) ?? 999) || a.slug.localeCompare(b.slug)
  );
}

// ── Merge ─────────────────────────────────────────────────────────────────

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { bad(`${p}: unreadable or invalid JSON — ${e.message}`); return null; }
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const dry = args.includes("--dry-run");
  const files = args.filter((a) => !a.startsWith("--"));
  const ids = widgetIds();
  const spine = spineSlugs();

  let codex;
  if (check) {
    if (!fs.existsSync(CODEX)) {
      console.error(`✗ ${CODEX} does not exist yet — nothing to check.`);
      process.exit(1);
    }
    codex = readJson(CODEX);
  } else {
    if (!files.length) {
      console.error("usage: node tools/merge-codex.cjs research/codex/*.json [--dry-run]");
      process.exit(2);
    }
    // Start from what's shipped so a partial merge adds rather than replaces.
    codex = fs.existsSync(CODEX) ? readJson(CODEX) : { clusters: [], architectures: [] };
    if (!codex) process.exit(1);
    codex.clusters ??= [];
    codex.architectures ??= [];

    for (const f of files) {
      // Files starting with `_` are working files, not content: `_repair.json`
      // is a patch list for patch-codex.cjs and lives in the same directory, so
      // `research/codex/*.json` sweeps it up. Skipping by convention beats making
      // every caller write a cleverer glob.
      if (path.basename(f).startsWith("_")) continue;
      const data = readJson(path.resolve(f));
      if (!data) continue;
      // A cluster file has a top-level slug + entries; an architecture file has
      // `architectures`. Anything else is a shape we don't recognize, and
      // guessing would be how a malformed file gets silently half-merged.
      if (Array.isArray(data.architectures)) {
        for (const a of data.architectures) {
          const i = codex.architectures.findIndex((x) => x.slug === a.slug);
          if (i >= 0) codex.architectures[i] = a; else codex.architectures.push(a);
        }
        console.log(`  + ${path.basename(f)}: ${data.architectures.length} architecture(s)`);
      } else if (typeof data.slug === "string" && Array.isArray(data.entries)) {
        // A whole cluster in one file.
        const i = codex.clusters.findIndex((c) => c.slug === data.slug);
        if (i >= 0) codex.clusters[i] = data; else codex.clusters.push(data);
        console.log(`  + ${path.basename(f)}: cluster "${data.slug}" with ${data.entries.length} entr(ies)`);
      } else if (Array.isArray(data.entries)) {
        /**
         * A MICRO-BATCH: entries with no cluster of their own.
         *
         * Authoring a 10-entry bilingual cluster in one agent response does not
         * fit — the first attempt stalled and retried on every cluster. So the
         * fleet emits 4-5 entries per file and the cluster is assembled HERE,
         * from a filename→cluster map. The map lives in this script rather than
         * in the agent's output because which cluster an entry belongs to is an
         * editorial decision about the reference's shape, and it should not be
         * re-decided by whichever agent happened to write the batch.
         */
        const cluster = clusterForBatch(path.basename(f, ".json"));
        if (!cluster) {
          bad(`${f}: filename does not map to a cluster — add it to BATCH_CLUSTER in tools/merge-codex.cjs`);
          continue;
        }
        let target = codex.clusters.find((c) => c.slug === cluster.slug);
        if (!target) {
          target = { slug: cluster.slug, title: cluster.title, tagline: cluster.tagline, entries: [] };
          codex.clusters.push(target);
        }
        for (const e of data.entries) {
          const i = target.entries.findIndex((x) => x.slug === e.slug);
          if (i >= 0) target.entries[i] = e; else target.entries.push(e);
        }
        console.log(`  + ${path.basename(f)}: ${data.entries.length} entr(ies) → cluster "${cluster.slug}"`);
      } else {
        bad(`${f}: not a cluster ({slug,title,tagline,entries}), a micro-batch ({entries}), nor architectures ({architectures})`);
      }
    }
  }

  if (errs.length === 0) {
    if (!check) sortCodex(codex);
    const stats = checkCodex(codex, ids, spine);
    if (errs.length === 0) {
      console.log(`\n✓ ${stats.clusters} cluster(s), ${stats.entries} entr(ies), ${stats.architectures} architecture(s) valid`);
    }
  }

  if (warns.length) {
    console.warn(`\n${warns.length} warning(s):`);
    for (const w of warns) console.warn("  ! " + w);
  }
  if (errs.length) {
    console.error(`\n${errs.length} error(s):`);
    for (const e of errs.slice(0, 120)) console.error("  ✗ " + e);
    if (errs.length > 120) console.error(`  … and ${errs.length - 120} more`);
    console.error(`\n✗ refusing to write codex.json.`);
    process.exit(1);
  }
  if (check) { console.log("✓ shipped codex is valid"); return; }
  if (dry) { console.log("✓ dry run — nothing written."); return; }

  fs.writeFileSync(CODEX, JSON.stringify(codex), "utf8");
  console.log(`✓ wrote src/content/data/codex.json`);
}

main();

module.exports = { checkCodex, checkEntry, checkArchitecture, errs, warns };
