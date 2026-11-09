// Shared content loading + validation. Used by check-concept (authors), build-content (app build).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONTENT = path.join(ROOT, "content");
export const LEVELS = ["core", "advanced", "staff"];
export const LANGS = ["python", "typescript", "javascript", "sql", "yaml", "bash", "json", "text", "go", "java"];

export function loadDomains() {
  return JSON.parse(fs.readFileSync(path.join(CONTENT, "domains.json"), "utf8"));
}

export function conceptPath(domain, id) {
  return path.join(CONTENT, "concepts", domain, `${id}.json`);
}

export function listConceptFiles() {
  const dir = path.join(CONTENT, "concepts");
  const out = [];
  for (const d of fs.readdirSync(dir)) {
    const sub = path.join(dir, d);
    if (!fs.statSync(sub).isDirectory()) continue;
    for (const f of fs.readdirSync(sub)) if (f.endsWith(".json") && !f.startsWith("_")) out.push(path.join(sub, f));
  }
  return out.sort();
}

const words = (s) => String(s || "").replace(/```[\s\S]*?```/g, " ").replace(/\[\[([a-z0-9-]+)\]\]/g, "x").replace(/[*_`#>\[\]()]/g, " ").split(/\s+/).filter(Boolean).length;

// Function words that are (nearly) exclusive to one language — a cheap "is this really Spanish" probe.
const EN_FW = /\b(the|and|with|which|that|this|of|is|are|you|your|for|when|it)\b/gi;
const ES_FW = /\b(el|la|los|las|y|con|que|de|es|son|tu|para|cuando|una|del)\b/gi;
function looksSpanish(s) {
  const en = (s.match(EN_FW) || []).length, es = (s.match(ES_FW) || []).length;
  return words(s) < 8 || es >= en;
}

/** Validate one concept object. Returns {errors, warnings}. */
export function validateConcept(c, file, domains) {
  const errors = [], warnings = [];
  const E = (m) => errors.push(m), W = (m) => warnings.push(m);
  const ids = new Map();
  for (const d of domains) for (const id of d.concepts) ids.set(id, d.id);
  const base = path.basename(file || "", ".json");

  if (!c || typeof c !== "object") return { errors: ["not an object"], warnings };
  if (file && c.id !== base) E(`id "${c.id}" != filename "${base}"`);
  if (!ids.has(c.id)) E(`id "${c.id}" not in domains.json`);
  else if (ids.get(c.id) !== c.domain) E(`domain "${c.domain}" but domains.json puts it in "${ids.get(c.id)}"`);
  if (file && path.basename(path.dirname(file)) !== c.domain) E(`file is not under content/concepts/${c.domain}/`);
  if (!LEVELS.includes(c.level)) E(`level must be one of ${LEVELS}`);

  const isCase = c.domain === "design";
  const t = (field, v, { min = 0, max = Infinity, req = true, es = true } = {}) => {
    if (v == null) { if (req) E(`${field} missing`); return; }
    if (typeof v !== "object" || typeof v.en !== "string" || typeof v.es !== "string") return E(`${field} must be {en, es} strings`);
    if (!v.en.trim() || !v.es.trim()) return E(`${field} has an empty language`);
    const n = words(v.en);
    if (n < min) E(`${field}: ${n} words < ${min}`);
    if (n > max) E(`${field}: ${n} words > ${max}`);
    if (es && n >= 12 && v.en.trim() === v.es.trim()) E(`${field}: es is identical to en`);
    if (es && !looksSpanish(v.es)) E(`${field}: es does not read as Spanish`);
    for (const m of (v.en + " " + v.es).matchAll(/\[\[([^\]]+)\]\]/g)) if (!ids.has(m[1])) E(`${field}: [[${m[1]}]] is not a concept id`);
  };
  const list = (field, arr, min, max, each) => {
    if (!Array.isArray(arr)) return E(`${field} must be an array`);
    if (arr.length < min || arr.length > max) E(`${field}: ${arr.length} items, want ${min}-${max}`);
    arr.forEach((x, i) => each(`${field}[${i}]`, x));
  };

  t("title", c.title, { min: 1, max: 10, es: false });
  list("aliases", c.aliases, 1, 12, (f, x) => { if (typeof x !== "string" || !x.trim()) E(`${f} must be a string`); });
  t("tldr", c.tldr, { min: 8, max: 45 });
  t("analogy", c.analogy, { req: false, max: 50 });
  t("explain", c.explain, { min: 60, max: isCase ? 460 : 270 });
  t("example", c.example, { min: 25, max: 170 });
  t("whenToUse", c.whenToUse, { max: 55 });
  t("whenNotToUse", c.whenNotToUse, { max: 55 });
  list("pros", c.pros, 2, 5, (f, x) => t(f, x, { max: 40 }));
  list("cons", c.cons, 2, 5, (f, x) => t(f, x, { max: 40 }));
  list("numbers", c.numbers ?? [], 0, 6, (f, x) => t(f, x, { max: 45 }));
  list("pitfalls", c.pitfalls, 2, 5, (f, x) => t(f, x, { max: 45 }));
  list("interview", c.interview, 2, 4, (f, x) => { t(`${f}.q`, x?.q, { max: 40 }); t(`${f}.a`, x?.a, { min: 25, max: 150 }); });
  if (c.deepDive != null) list("deepDive", c.deepDive, 1, 7, (f, x) => { t(`${f}.title`, x?.title, { max: 10, es: false }); t(`${f}.body`, x?.body, { min: 20, max: 170 }); });
  list("related", c.related, 2, 7, (f, x) => { if (!ids.has(x)) E(`${f}: "${x}" is not a concept id`); if (x === c.id) E(`${f}: self-reference`); });
  list("sources", c.sources, 1, 5, (f, x) => {
    if (!x || typeof x.title !== "string" || !/^https?:\/\/\S+$/.test(x.url || "")) E(`${f} needs {title, url}`);
  });

  if (c.diagram == null) W("no diagram");
  else {
    if (typeof c.diagram.code !== "string" || !/^(flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram|timeline|quadrantChart|xychart|mindmap)/.test(c.diagram.code.trim())) E("diagram.code must be a mermaid diagram");
    if (/\b(style|classDef|click)\b\s/.test(c.diagram.code)) E("diagram: no style/classDef/click");
    t("diagram.caption", c.diagram.caption, { max: 40 });
  }
  if (c.code != null) {
    if (!LANGS.includes(c.code.lang)) E(`code.lang must be one of ${LANGS}`);
    if (typeof c.code.source !== "string" || !c.code.source.trim()) E("code.source missing");
    else if (c.code.source.split("\n").length > 40) E(`code.source: ${c.code.source.split("\n").length} lines > 40`);
    t("code.title", c.code.title, { max: 14, es: false });
  }
  const known = new Set(["id","domain","level","title","aliases","tldr","analogy","explain","diagram","code","example","deepDive","pros","cons","whenToUse","whenNotToUse","numbers","pitfalls","interview","related","sources"]);
  for (const k of Object.keys(c)) if (!known.has(k)) E(`unknown field "${k}"`);
  return { errors, warnings };
}

/** Launch Chromium: default Playwright browser, else the preinstalled one (cloud containers). */
export async function launchBrowser() {
  const { chromium } = await import("playwright");
  try { return await chromium.launch(); }
  catch { return await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium", args: ["--headless", "--no-sandbox"] }); }
}

import crypto from "node:crypto";
/** Bump when the diagram theme changes so every SVG re-renders. */
export const DIAGRAM_THEME_VERSION = "1";
export const DIAGRAMS = path.join(CONTENT, "diagrams");
export function diagramHash(code) {
  return crypto.createHash("sha1").update(DIAGRAM_THEME_VERSION + "\n" + code).digest("hex").slice(0, 12);
}
export function readDiagramHash(file) {
  if (!fs.existsSync(file)) return null;
  const m = fs.readFileSync(file, "utf8").match(/^<!-- h:([0-9a-f]+) -->/);
  return m ? m[1] : null;
}

/* ---------------------------------------------------------------- exercises
 * content/exercises/<domain>/<concept>.json = { concept, items: [...] }. Every item is graded
 * deterministically in the browser (no LLM). Option order is shuffled at render, so the authored
 * index of the correct answer carries no signal; the length check below guards the other classic
 * tell (the correct option being visibly the longest/most qualified one). */
export const EXERCISE_TYPES = ["mcq", "multi", "order", "match", "numeric", "code"];
export const EXERCISES = path.join(CONTENT, "exercises");

export function listExerciseFiles() {
  if (!fs.existsSync(EXERCISES)) return [];
  const out = [];
  for (const d of fs.readdirSync(EXERCISES)) {
    const sub = path.join(EXERCISES, d);
    if (!fs.statSync(sub).isDirectory()) continue;
    for (const f of fs.readdirSync(sub)) if (f.endsWith(".json") && !f.startsWith("_")) out.push(path.join(sub, f));
  }
  return out.sort();
}

const optLen = (o) => (typeof o.text === "string" ? o.text : o.text?.en ?? "").length;

export function validateExercises(x, file, domains) {
  const errors = [], warnings = [];
  const E = (m) => errors.push(m), W = (m) => warnings.push(m);
  const ids = new Map();
  for (const d of domains) for (const id of d.concepts) ids.set(id, d.id);
  const base = path.basename(file || "", ".json");
  if (!x || typeof x !== "object") return { errors: ["not an object"], warnings };
  if (file && x.concept !== base) E(`concept "${x.concept}" != filename "${base}"`);
  if (!ids.has(x.concept)) E(`concept "${x.concept}" not in domains.json`);
  else if (file && path.basename(path.dirname(file)) !== ids.get(x.concept)) E(`file must live under content/exercises/${ids.get(x.concept)}/`);
  if (!Array.isArray(x.items) || x.items.length < 2 || x.items.length > 6) E("items: want 2-6");
  const t = (f, v, { min = 1, max = Infinity } = {}) => {
    if (!v || typeof v.en !== "string" || typeof v.es !== "string" || !v.en.trim() || !v.es.trim()) return E(`${f} must be {en, es}`);
    const n = words(v.en);
    if (n < min) E(`${f}: ${n} words < ${min}`);
    if (n > max) E(`${f}: ${n} words > ${max}`);
    if (n >= 10 && v.en.trim() === v.es.trim()) E(`${f}: es is identical to en`);
    if (n >= 8 && !looksSpanish(v.es)) E(`${f}: es does not read as Spanish`);
    for (const m of (v.en + " " + v.es).matchAll(/\[\[([^\]]+)\]\]/g)) if (!ids.has(m[1])) E(`${f}: [[${m[1]}]] is not a concept id`);
  };
  const seen = new Set();
  (x.items || []).forEach((it, i) => {
    const f = `items[${i}]`;
    if (typeof it.id !== "string" || !it.id.startsWith(`${x.concept}.`)) E(`${f}.id must start with "${x.concept}."`);
    else if (seen.has(it.id)) E(`${f}.id duplicated`); else seen.add(it.id);
    if (!EXERCISE_TYPES.includes(it.type)) return E(`${f}.type must be one of ${EXERCISE_TYPES}`);
    t(`${f}.prompt`, it.prompt, { min: 4, max: 70 });
    t(`${f}.explain`, it.explain, { min: 10, max: 100 });
    const opts = (n0, n1, codeText = false) => {
      if (!Array.isArray(it.options) || it.options.length < n0 || it.options.length > n1) return E(`${f}.options: want ${n0}-${n1}`);
      const texts = new Set();
      it.options.forEach((o, j) => {
        if (codeText) { if (typeof o.text !== "string" || !o.text.trim()) E(`${f}.options[${j}].text must be a code string`); }
        else t(`${f}.options[${j}].text`, o.text, { max: 40 });
        if (o.why != null) t(`${f}.options[${j}].why`, o.why, { max: 45 });
        const key = typeof o.text === "string" ? o.text : o.text?.en;
        if (texts.has(key)) E(`${f}.options[${j}] duplicates another option`); texts.add(key);
      });
    };
    if (it.type === "mcq" || it.type === "code") {
      opts(3, 5, it.type === "code");
      if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= (it.options?.length ?? 0)) E(`${f}.answer out of range`);
      else {
        const lens = it.options.map(optLen), right = lens[it.answer], others = lens.filter((_, j) => j !== it.answer);
        if (others.length && right > 1.6 * Math.max(...others)) W(`${f}: correct option is much longer than every distractor (a tell)`);
      }
      if (it.type === "code") {
        if (typeof it.lang !== "string" || !LANGS.includes(it.lang)) E(`${f}.lang must be one of ${LANGS}`);
        if (typeof it.code !== "string" || (it.code.match(/____/g) || []).length !== 1) E(`${f}.code must contain exactly one ____ gap`);
        else if (it.code.split("\n").length > 22) E(`${f}.code: keep it under 22 lines`);
      }
    }
    if (it.type === "multi") {
      opts(4, 6);
      const a = it.answers;
      if (!Array.isArray(a) || a.length < 2 || new Set(a).size !== a.length || a.some((k) => !Number.isInteger(k) || k < 0 || k >= (it.options?.length ?? 0))) E(`${f}.answers: want ≥2 distinct valid indexes`);
      else if (a.length === it.options.length) E(`${f}.answers: not every option can be correct`);
    }
    if (it.type === "order") {
      if (!Array.isArray(it.steps) || it.steps.length < 3 || it.steps.length > 7) E(`${f}.steps: want 3-7, in the correct order`);
      else it.steps.forEach((s, j) => t(`${f}.steps[${j}]`, s, { max: 22 }));
    }
    if (it.type === "match") {
      // 2 pairs is solvable by elimination after one guess: always ≥ 3, prefer 4.
      if (!Array.isArray(it.pairs) || it.pairs.length < 3 || it.pairs.length > 5) E(`${f}.pairs: want 3-5`);
      else it.pairs.forEach((p, j) => { t(`${f}.pairs[${j}].left`, p.left, { max: 10 }); t(`${f}.pairs[${j}].right`, p.right, { max: 26 }); });
    }
    if (it.type === "numeric") {
      if (typeof it.answer !== "number" || !Number.isFinite(it.answer) || it.answer <= 0) E(`${f}.answer must be a positive number`);
      if (typeof it.tolerance !== "number" || it.tolerance <= 0 || it.tolerance > 0.5) E(`${f}.tolerance: relative, in (0, 0.5]`);
      if (it.unit != null && typeof it.unit !== "string") E(`${f}.unit must be a string`);
    }
    const known = new Set(["id", "type", "prompt", "explain", "options", "answer", "answers", "steps", "pairs", "tolerance", "unit", "lang", "code"]);
    for (const k of Object.keys(it)) if (!known.has(k)) E(`${f}: unknown field "${k}"`);
  });
  return { errors, warnings };
}
