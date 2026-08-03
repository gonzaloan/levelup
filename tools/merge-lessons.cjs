#!/usr/bin/env node
/**
 * Validating merge of authored lessons into src/content/data/lessons.json.
 *
 * lessons.json is ~3MB of hand-authored bilingual content; a bad merge here has
 * destroyed real work before (a repair agent's changelog note was once written
 * into a lesson's `overview`). So this script is strict and never partially
 * writes: any error aborts the whole merge.
 *
 * Validates against the ConceptLesson/Lesson contract in src/lib/types.ts:
 *   • lessonId matches an actual domain×level in the spine
 *   • the lesson's concept slugs exactly match that band's spine concepts
 *   • all learner-facing strings bilingual, and es ≠ en
 *   • diagram/architecture shape matches its `kind` (a mismatch renders empty)
 *   • widgetId exists in the viz registry
 *   • midQuiz items have exactly one correct option
 *   • no banned Spanish calques
 *   • `architecture` is not a near-duplicate of `diagram`
 *
 * Usage: node tools/merge-lessons.cjs research/cloud-lesson-l3.json …
 *        node tools/merge-lessons.cjs --check
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const LESSONS = path.join(ROOT, "src/content/data/lessons.json");
const SPINE = path.join(ROOT, "src/content/data/curriculum.json");
const VIZ = path.join(ROOT, "src/components/viz/index.ts");
/**
 * Banned Spanish calques.
 *
 * `eventualmente` is a false friend: in Spanish it means "occasionally /
 * possibly", not English "eventually". The negative lookahead exempts
 * "eventualmente consistente", which IS the established Spanish term for eventual
 * consistency — the one place the word is correct.
 */
const BANNED = new RegExp([
  "\\blibrer[íi]as?\\b",
  "\\brobust[oa]s?\\b",
  "\\brobustez\\b",
  "\\bcorrectitud\\b",
  // False friend: Spanish "eventualmente" means occasionally/possibly, not
  // "in time". The lookahead exempts "eventualmente consistente", which IS the
  // correct Spanish term for eventual consistency.
  "\\beventualmente\\b(?!\\s+consistente)",
  // "X es por qué Y" / "X es cómo Y" are English "is why"/"is how" carried over
  // literally; in Spanish a copula plus a bare interrogative reads as an
  // unfinished indirect question. Correct forms: "es la razón por la que",
  // "es lo que", "por eso". Only the calque shape is banned — the negative
  // lookbehinds keep the legitimate predicative uses the corpus already has
  // ("sabes por qué está cada línea", "la escalabilidad es cómo se sostiene…",
  // "el arreglo es por qué sigue muriendo").
  "(?<!sab\\w{1,3} )(?<!arreglo )\\bes por qu[ée]\\b(?= (?:la|el|los|las|publicar|un|una)\\b)",
  // NOT banned, deliberately, after checking every occurrence in the corpus:
  //   • "triar" / "interruptor de aborto" — flagged by review as calques, but
  //     both are already this corpus's own established vocabulary (8 places,
  //     written before this pass) and both are used in Spanish engineering
  //     writing. Banning them would fail the build on legitimate content and
  //     force a rewrite of text nobody complained about. The one case that WAS
  //     wrong — "aborto automático" describing a chaos experiment's stop
  //     condition, where "interrupción" is clearer — was fixed in place.
  //   • "abortos" for transaction aborts — the standard term.
  // The lesson: a banned-word list is only useful when every hit is a defect.
  // A rule that fires on correct content trains people to bypass the validator.
].join("|"), "iu");

const errs = [];
const warns = [];
const bad = (m) => errs.push(m);

const isI18n = (v) => !!v && typeof v.en === "string" && typeof v.es === "string";
const filled = (v) => isI18n(v) && v.en.trim().length > 0 && v.es.trim().length > 0;

/**
 * Assert a bilingual field: present, filled, translated, no calques.
 *
 * `sameOk` exempts fields where en === es is CORRECT rather than a missed
 * translation. Technical terms are the real case: "PACELC", "fsync", "SSTable",
 * "Write-ahead log (WAL)", "Circuit breaker" are the names Spanish-speaking
 * engineers actually use, and forcing an invented translation would make the
 * content worse. Prose fields get no such exemption — a paragraph identical in
 * both languages is always a bug.
 */
function checkI18n(v, where, { min = 1, optional = false, sameOk = false } = {}) {
  if (v === undefined || v === null) { if (!optional) bad(`${where}: missing`); return; }
  if (!isI18n(v)) return bad(`${where}: not an {en,es} object`);
  if (!filled(v)) return bad(`${where}: empty en or es`);
  if (v.en.trim().length < min) bad(`${where}: en too short`);
  if (!sameOk && v.en.trim() === v.es.trim()) bad(`${where}: es is untranslated (identical to en)`);
  if (BANNED.test(v.es)) bad(`${where}: banned calque in es`);
}

/** Short label-ish fields where an untranslated technical term is legitimate. */
const TERMISH = { sameOk: true };

/** Read the widget ids straight from the registry so the two can't drift. */
function widgetIds() {
  const src = fs.readFileSync(VIZ, "utf8");
  const body = src.slice(src.indexOf("WIDGETS"), src.indexOf("WIDGET_IDS"));
  return new Set([...body.matchAll(/"([a-z0-9-]+)":/g)].map((m) => m[1]));
}

/** Diagram/architecture: the renderer keys off `kind`, so shape must match. */
function checkSchematic(s, where, ids) {
  if (s === undefined) return;
  const kinds = ["flow", "compare", "stack", "axes", "none"];
  if (!kinds.includes(s.kind)) return bad(`${where}: bad kind "${s.kind}"`);
  // kind "none" is a deliberate opt-out: the concept teaches through an
  // interactive widget instead, so the renderer draws nothing here. An empty
  // caption is correct in that case, not a missing translation.
  if (s.kind === "none") return;
  checkI18n(s.caption, `${where}.caption`);
  if (s.kind === "flow" || s.kind === "stack") {
    if (!Array.isArray(s.nodes) || s.nodes.length < 2) bad(`${where}: kind ${s.kind} needs ≥2 nodes`);
    for (const [i, n] of (s.nodes ?? []).entries()) {
      checkI18n(n.label, `${where}.nodes[${i}].label`, TERMISH);
      // Node notes are annotations, not prose — often a bare term or a
      // cardinality ("at-least-once", "top-50 → top-k", "Hash map / set, O(1)")
      // that is identical in both languages by design.
      checkI18n(n.note, `${where}.nodes[${i}].note`, { optional: true, sameOk: true });
    }
    if (s.left || s.right) warns.push(`${where}: kind ${s.kind} ignores left/right`);
  } else if (s.kind === "compare") {
    for (const side of ["left", "right"]) {
      const c = s[side];
      if (!c) { bad(`${where}: kind compare needs ${side}`); continue; }
      checkI18n(c.title, `${where}.${side}.title`, TERMISH);
      if (!Array.isArray(c.points) || c.points.length < 2) bad(`${where}.${side}: needs ≥2 points`);
      for (const [i, p] of (c.points ?? []).entries()) checkI18n(p, `${where}.${side}.points[${i}]`);
    }
    if (s.nodes) warns.push(`${where}: kind compare ignores nodes`);
  } else if (s.kind === "axes") {
    checkI18n(s.xAxis, `${where}.xAxis`, TERMISH);
    checkI18n(s.yAxis, `${where}.yAxis`, TERMISH);
    // An `axes` schematic with no nodes renders two axis lines and NOTHING on
    // them: Schematic.tsx reads `spec.nodes ?? []` and gates its legend on
    // `nodes.length > 0`. This file's header has always promised that a shape
    // mismatch is caught here — and for `axes` it was not checked at all, which
    // is how 7 empty figures shipped. Verified in the built HTML: the caption is
    // present and no `schematic-axes` element exists.
    if (!Array.isArray(s.nodes) || s.nodes.length < 2) {
      bad(`${where}: kind axes needs ≥2 nodes to plot, or it renders an empty pair of axis lines (set kind "none" if no figure is intended)`);
    }
  }
}

function checkConcept(c, where, ids) {
  checkI18n(c.explanation, `${where}.explanation`, { min: 200 });
  if (!Array.isArray(c.keyPoints) || c.keyPoints.length < 2) bad(`${where}.keyPoints: needs ≥2`);
  for (const [i, k] of (c.keyPoints ?? []).entries()) checkI18n(k, `${where}.keyPoints[${i}]`);
  if (!c.diagram) bad(`${where}.diagram: missing`);
  checkSchematic(c.diagram, `${where}.diagram`, ids);
  checkSchematic(c.architecture, `${where}.architecture`, ids);
  // The recurring quality failure: `architecture` restating `diagram`.
  if (c.architecture && c.diagram && isI18n(c.architecture.caption) && isI18n(c.diagram.caption)) {
    const norm = (s) => s.toLowerCase().replace(/[^a-z ]/g, "").split(/\s+/).filter((w) => w.length > 3);
    const a = new Set(norm(c.architecture.caption.en));
    const d = norm(c.diagram.caption.en);
    const overlap = d.filter((w) => a.has(w)).length / Math.max(1, d.length);
    if (overlap > 0.7) warns.push(`${where}: architecture caption ~duplicates diagram caption`);
  }
  checkI18n(c.depth, `${where}.depth`, { optional: true, min: 100 });
  checkI18n(c.analogy, `${where}.analogy`, { optional: true });
  checkI18n(c.mnemonic, `${where}.mnemonic`, { optional: true, sameOk: true });
  for (const [i, p] of (c.pitfalls ?? []).entries()) checkI18n(p, `${where}.pitfalls[${i}]`);
  for (const [i, k] of (c.keywords ?? []).entries()) {
    checkI18n(k.term, `${where}.keywords[${i}].term`, TERMISH);
    checkI18n(k.def, `${where}.keywords[${i}].def`);
  }
  for (const [i, ch] of (c.children ?? []).entries()) {
    checkI18n(ch.label, `${where}.children[${i}].label`, TERMISH);
    checkI18n(ch.detail, `${where}.children[${i}].detail`);
  }
  for (const [i, f] of (c.flashcards ?? []).entries()) {
    checkI18n(f.front, `${where}.flashcards[${i}].front`, TERMISH);
    checkI18n(f.back, `${where}.flashcards[${i}].back`);
  }
  if (c.example) {
    checkI18n(c.example.scenario, `${where}.example.scenario`);
    checkI18n(c.example.walkthrough, `${where}.example.walkthrough`);
  }
  if (c.code) {
    if (typeof c.code.lang !== "string" || !c.code.lang) bad(`${where}.code.lang: missing`);
    if (typeof c.code.snippet !== "string" || c.code.snippet.trim().length < 20) bad(`${where}.code.snippet: too short`);
    checkI18n(c.code.caption, `${where}.code.caption`, { optional: true });
    const lines = (c.code.snippet ?? "").split("\n").length;
    for (const [i, a] of (c.code.annotations ?? []).entries()) {
      if (!Number.isInteger(a.line) || a.line < 1 || a.line > lines) {
        bad(`${where}.code.annotations[${i}]: line ${a.line} out of range (1..${lines})`);
      }
      checkI18n(a.note, `${where}.code.annotations[${i}].note`);
    }
  }
  if (c.visual) {
    if (!ids.has(c.visual.widgetId)) bad(`${where}.visual: unknown widgetId "${c.visual.widgetId}"`);
  }
  // `source` was validated ONLY when present, so a concept could ship asserting
  // specific multipliers with no citation at all and nothing noticed —
  // `unit-economics-at-scale` did exactly that. All 178 concepts now carry one, so
  // the field is required rather than optional: an enriched concept that makes a
  // quantitative claim without a source cannot be maintained (section 14).
  // Predict: a commitment before the concept explains itself. Optional (only the
  // RAG vertical slice carries it so far), but when present it must be usable —
  // a prediction with one option, or with no wrong option, is not a prediction.
  if (c.predict !== undefined) {
    const pw = `${where}.predict`;
    checkI18n(c.predict.prompt, `${pw}.prompt`, { min: 40 });
    checkI18n(c.predict.resolution, `${pw}.resolution`, { min: 40 });
    const opts = c.predict.options;
    if (!Array.isArray(opts) || opts.length < 2) {
      bad(`${pw}.options: needs ≥2 options, or there is nothing to commit to`);
    } else {
      const right = opts.filter((o) => o && o.correct === true).length;
      if (right !== 1) bad(`${pw}.options: exactly one option must be correct (found ${right})`);
      for (const [i, o] of opts.entries()) {
        checkI18n(o?.text, `${pw}.options[${i}].text`);
        // Every option needs its own `why`, including the wrong ones — that IS the
        // teaching. An option with no explanation makes a wrong guess a dead end.
        checkI18n(o?.why, `${pw}.options[${i}].why`, { min: 30 });
      }
    }
  }

  if (c.source === undefined || typeof c.source !== "string" || c.source.trim().length < 8) {
    bad(`${where}.source: missing or too short to be checkable`);
  }
}

function checkQuiz(items, where) {
  if (!Array.isArray(items) || items.length < 2) return bad(`${where}: needs ≥2 items`);
  for (const [i, it] of items.entries()) {
    const w = `${where}[${i}]`;
    checkI18n(it.stem, `${w}.stem`);
    if (!Array.isArray(it.options) || it.options.length < 3) { bad(`${w}.options: needs ≥3`); continue; }
    const n = it.options.filter((o) => o.correct === true).length;
    if (n !== 1) bad(`${w}: ${n} correct options, needs exactly 1`);
    for (const [j, o] of it.options.entries()) {
      checkI18n(o.text, `${w}.options[${j}].text`);
      checkI18n(o.rationale, `${w}.options[${j}].rationale`);
    }
  }
}

function checkLesson(lesson, spine, ids) {
  const id = lesson.lessonId;
  if (typeof id !== "string" || !/^[a-z-]+-l[3-7]$/.test(id)) return bad(`bad lessonId "${id}"`);
  const level = id.slice(-2).toUpperCase();
  const domainId = id.slice(0, -3);
  const dom = spine.domains.find((d) => d.id === domainId);
  if (!dom) return bad(`${id}: no such domain "${domainId}"`);
  const band = dom.levels.find((l) => l.level === level);
  if (!band) return bad(`${id}: domain ${domainId} has no ${level}`);

  checkI18n(lesson.overview, `${id}.overview`, { min: 200 });
  if (!Array.isArray(lesson.concepts)) return bad(`${id}.concepts: not an array`);

  const want = band.concepts.map((c) => c.slug);
  const got = lesson.concepts.map((c) => c.slug);
  const missing = want.filter((s) => !got.includes(s));
  const extra = got.filter((s) => !want.includes(s));
  if (missing.length) bad(`${id}: missing concepts: ${missing.join(", ")}`);
  if (extra.length) bad(`${id}: concepts not in the spine band: ${extra.join(", ")}`);
  if (new Set(got).size !== got.length) bad(`${id}: duplicate concept slugs`);

  for (const c of lesson.concepts) checkConcept(c, `${id}/${c.slug}`, ids);
  checkQuiz(lesson.midQuiz, `${id}.midQuiz`);
  for (const [i, s] of (lesson.cheatSheet ?? []).entries()) {
    checkI18n(s.heading, `${id}.cheatSheet[${i}].heading`, TERMISH);
    for (const [j, r] of (s.rows ?? []).entries()) {
      checkI18n(r.term, `${id}.cheatSheet[${i}].rows[${j}].term`, TERMISH);
      checkI18n(r.note, `${id}.cheatSheet[${i}].rows[${j}].note`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const inputs = args.filter((a) => !a.startsWith("--"));
  const spine = JSON.parse(fs.readFileSync(SPINE, "utf8"));
  const ids = widgetIds();
  const data = JSON.parse(fs.readFileSync(LESSONS, "utf8"));

  if (checkOnly) {
    for (const l of data.lessons) checkLesson(l, spine, ids);
  } else {
    const byId = new Map(data.lessons.map((l) => [l.lessonId, l]));
    for (const f of inputs) {
      const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
      if (!fs.existsSync(p)) { bad(`input not found: ${f}`); continue; }
      const incoming = JSON.parse(fs.readFileSync(p, "utf8")).lessons ?? [];
      if (!incoming.length) { bad(`${f}: no lessons`); continue; }
      for (const l of incoming) {
        const before = errs.length;
        checkLesson(l, spine, ids);
        if (errs.length > before) continue;           // rejected — don't stage it
        const replaced = byId.has(l.lessonId);
        byId.set(l.lessonId, l);
        console.log(`  ${replaced ? "replaced" : "added"} ${l.lessonId} (${l.concepts.length} concepts, ${l.midQuiz.length} quiz items)`);
      }
    }
    if (!errs.length) {
      const domOrder = spine.domains.map((d) => d.id);
      const lv = (id) => Number(id.slice(-1));
      data.lessons = [...byId.values()].sort(
        (a, b) => domOrder.indexOf(a.lessonId.slice(0, -3)) - domOrder.indexOf(b.lessonId.slice(0, -3)) || lv(a.lessonId) - lv(b.lessonId)
      );
    }
  }

  if (warns.length) { console.log(`\n${warns.length} warning(s):`); for (const w of warns.slice(0, 30)) console.log("  ! " + w); }
  if (errs.length) {
    console.error(`\n${errs.length} error(s):`);
    for (const e of errs.slice(0, 60)) console.error("  ✗ " + e);
    if (errs.length > 60) console.error(`  … and ${errs.length - 60} more`);
    console.error(checkOnly ? "" : "\n✗ refusing to write lessons.json.");
    process.exit(1);
  }
  if (checkOnly) { console.log(`✓ ${data.lessons.length} lessons valid.`); return; }
  fs.writeFileSync(LESSONS, JSON.stringify(data), "utf8");
  console.log(`✓ wrote lessons.json: ${data.lessons.length} lessons`);
}

// Running as a CLI does the merge; being `require`d only exports the validator.
if (require.main === module) main();

// Reused by tools/merge-code.cjs so the surgical patcher validates against the
// SAME rules as a full lesson merge — two validators would drift immediately.
module.exports = { checkConcept, widgetIds, errs, warns };
