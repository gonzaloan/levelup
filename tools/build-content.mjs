#!/usr/bin/env node
// The content gate + generator. Validates every concept, checks the pre-rendered diagrams are
// fresh, and writes the client-side search / practice indexes to src/generated/.
// Usage: node tools/build-content.mjs [--allow-missing]   (runs automatically before dev/build)
import fs from "node:fs";
import path from "node:path";
import { loadDomains, listConceptFiles, validateConcept, conceptPath, diagramHash, readDiagramHash, narrowCode, DIAGRAMS, ROOT, listExerciseFiles, validateExercises, listProblemFiles, validateProblem } from "./content-lib.mjs";

const allowMissing = process.argv.includes("--allow-missing");
const domains = loadDomains();
const errors = [], warnings = [];
const concepts = new Map();

for (const f of listConceptFiles()) {
  let c;
  try { c = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { errors.push(`${path.relative(ROOT, f)}: invalid JSON (${e.message})`); continue; }
  const r = validateConcept(c, f, domains);
  r.errors.forEach((e) => errors.push(`${c.id}: ${e}`));
  if (!r.errors.length) concepts.set(c.id, c);
}
for (const d of domains) for (const id of d.concepts) {
  if (!fs.existsSync(conceptPath(d.id, id))) (allowMissing ? warnings : errors).push(`missing concept ${d.id}/${id}`);
}
for (const c of concepts.values()) {
  if (!c.diagram) continue;
  const h = diagramHash(c.diagram.code);
  for (const mode of ["dark", "light"]) for (const v of narrowCode(c.diagram.code) ? ["", ".n"] : [""]) {
    if (readDiagramHash(path.join(DIAGRAMS, `${c.id}.${mode}${v}.svg`)) !== h) { (allowMissing ? warnings : errors).push(`${c.id}: diagram not rendered or stale — run npm run diagrams`); break; }
  }
}

// Labs: every lab names real concepts and has exactly one component (src/components/labs/<id>.tsx).
const labsFile = path.join(ROOT, "content", "labs.json");
if (fs.existsSync(labsFile)) {
  const labs = JSON.parse(fs.readFileSync(labsFile, "utf8"));
  const ids = new Set();
  const known = new Set(domains.flatMap((d) => d.concepts));
  for (const l of labs) {
    if (ids.has(l.id)) errors.push(`labs: duplicate id "${l.id}"`);
    ids.add(l.id);
    if (!l.title?.en || !l.title?.es || !l.blurb?.en || !l.blurb?.es) errors.push(`labs: "${l.id}" needs title and blurb in en and es`);
    for (const c of l.concepts ?? []) if (!known.has(c)) errors.push(`labs: "${l.id}" names unknown concept "${c}"`);
    if (!fs.existsSync(path.join(ROOT, "src", "components", "labs", `${l.id}.tsx`))) errors.push(`labs: "${l.id}" has no src/components/labs/${l.id}.tsx`);
    const fe = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", "@iconify-json", "fluent-emoji-flat", "icons.json"), "utf8"));
    if (!l.art || !(fe.icons[l.art] || fe.aliases?.[l.art])) errors.push(`labs: "${l.id}" art "${l.art}" is not a Fluent Emoji Flat icon`);
  }
  const reg = fs.readFileSync(path.join(ROOT, "src", "components", "labs", "registry.tsx"), "utf8");
  for (const id of ids) if (!reg.includes(`"${id}": dynamic(`)) errors.push(`labs: "${id}" is missing from registry.tsx`);
}

// Visuals: illustrations (Fluent Emoji Flat) per concept and the logo catalog must name real icons.
{
  const iconsOf = (pkg) => { const j = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", pkg, "icons.json"), "utf8")); return new Set([...Object.keys(j.icons), ...Object.keys(j.aliases ?? {})]); };
  const known = new Set(domains.flatMap((d) => d.concepts));
  const illFile = path.join(ROOT, "content", "illustrations.json");
  if (fs.existsSync(illFile)) {
    const fe = iconsOf("@iconify-json/fluent-emoji-flat");
    const ill = JSON.parse(fs.readFileSync(illFile, "utf8"));
    for (const [id, name] of Object.entries(ill)) {
      if (!known.has(id)) errors.push(`illustrations: "${id}" is not a concept id`);
      if (!fe.has(name)) errors.push(`illustrations: "${id}" → "${name}" is not a Fluent Emoji Flat icon`);
    }
    const missing = [...known].filter((id) => !ill[id]);
    if (missing.length) warnings.push(`illustrations: ${missing.length} concepts without an illustration (${missing.slice(0, 5).join(", ")}…)`);
  }
  const techFile = path.join(ROOT, "content", "tech.json");
  if (fs.existsSync(techFile)) {
    const logos = iconsOf("@iconify-json/logos");
    const seen = new Set();
    for (const x of JSON.parse(fs.readFileSync(techFile, "utf8"))) {
      if (seen.has(x.id)) errors.push(`tech: duplicate id "${x.id}"`);
      seen.add(x.id);
      if (!["tech", "company"].includes(x.kind)) errors.push(`tech: "${x.id}" kind must be tech or company`);
      if (!logos.has(String(x.icon).replace(/^logos:/, ""))) errors.push(`tech: "${x.id}" icon ${x.icon} not in the logos set`);
      if (!Array.isArray(x.match) || !x.match.length) errors.push(`tech: "${x.id}" needs match terms`);
    }
  }
}

// Coding problems: schema here (fast); tools/check-problems.mjs also runs every solution in Pyodide.
{
  const ids = new Set(domains.flatMap((d) => d.concepts));
  for (const f of listProblemFiles()) {
    let p;
    try { p = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { errors.push(`${path.relative(ROOT, f)}: invalid JSON (${e.message})`); continue; }
    validateProblem(p, ids).forEach((e) => errors.push(`problem ${p.id}: ${e}`));
  }
}

// Pyodide (MPL-2.0) is served from our own origin, unmodified, only to the coding pages.
{
  const src = path.join(ROOT, "node_modules", "pyodide");
  const dst = path.join(ROOT, "public", "pyodide");
  if (fs.existsSync(src)) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json", "package.json"]) {
      const from = path.join(src, f), to = path.join(dst, f);
      if (fs.existsSync(from) && (!fs.existsSync(to) || fs.statSync(to).size !== fs.statSync(from).size)) fs.copyFileSync(from, to);
    }
  }
}

// The architecture map may only point at concepts in the syllabus.
const mapFile = path.join(ROOT, "content", "architecture-map.json");
if (fs.existsSync(mapFile)) {
  const map = JSON.parse(fs.readFileSync(mapFile, "utf8"));
  const known = new Set(domains.flatMap((d) => d.concepts));
  if (!known.has(map.hub)) errors.push(`architecture-map: hub "${map.hub}" is not a concept id`);
  for (const g of [...map.layers, ...map.crosscutting]) for (const id of g.items) {
    if (!known.has(id)) errors.push(`architecture-map: "${id}" (${g.id}) is not a concept id`);
    else if (!concepts.has(id)) (allowMissing ? warnings : errors).push(`architecture-map: "${id}" is not written yet`);
  }
}

const plain = (s) => String(s || "").replace(/\[\[([a-z0-9-]+)\]\]/g, (_, id) => concepts.get(id)?.title?.en || id).replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();
const domainOf = new Map();
domains.forEach((d) => d.concepts.forEach((id) => domainOf.set(id, d.id)));

const outDir = path.join(ROOT, "src", "generated");
fs.mkdirSync(outDir, { recursive: true });
for (const lang of ["en", "es"]) {
  const search = [];
  for (const d of domains) for (const id of d.concepts) {
    const c = concepts.get(id);
    if (!c) continue;
    search.push({
      id, d: d.id, l: c.level,
      t: c.title[lang], o: c.title[lang === "en" ? "es" : "en"],
      a: c.aliases.join(" · "),
      s: plain(c.tldr[lang]),
      b: plain(c.explain[lang]).slice(0, 600),
      q: c.interview.map((x) => plain(x.q[lang])).join(" · "),
    });
  }
  fs.writeFileSync(path.join(outDir, `search-${lang}.json`), JSON.stringify(search));
}

/* ------------------------------------------------------------ learning path */
const pathFile = path.join(ROOT, "content", "path.json");
const studyPath = JSON.parse(fs.readFileSync(pathFile, "utf8"));
{
  const all = domains.flatMap((d) => d.concepts);
  const inPath = studyPath.phases.flatMap((p) => p.modules.flatMap((m) => m.concepts));
  for (const id of inPath) if (!domainOf.has(id)) errors.push(`path: "${id}" is not a concept id`);
  for (const id of all) if (!inPath.includes(id)) errors.push(`path: "${id}" is missing from content/path.json`);
  const dup = inPath.filter((x, i) => inPath.indexOf(x) !== i);
  if (dup.length) errors.push(`path: duplicated ${[...new Set(dup)].join(", ")}`);
}

/* ------------------------------------------------------------ exercises */
const authored = new Map();
for (const f of listExerciseFiles()) {
  let x;
  try { x = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { errors.push(`${path.relative(ROOT, f)}: invalid JSON (${e.message})`); continue; }
  const r = validateExercises(x, f, domains);
  r.errors.forEach((e) => errors.push(`exercises/${x.concept}: ${e}`));
  r.warnings.forEach((w) => warnings.push(`exercises/${x.concept}: ${w}`));
  if (!r.errors.length) authored.set(x.concept, x.items);
}

// Deterministic hash → stable choices for auto-generated items (same build, same exercise).
const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = (arr, n, seed) => [...arr].sort((a, b) => hash(seed + a) - hash(seed + b)).slice(0, n);
const graphs = new Map();
for (const c of concepts.values()) {
  const g = path.join(DIAGRAMS, `${c.id}.graph.json`);
  if (fs.existsSync(g)) graphs.set(c.id, JSON.parse(fs.readFileSync(g, "utf8")));
}
const GENERIC = /^(user|users|client|llm|model|app|api|start|end|done|yes|no|output|input|answer|response|request)$/i;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function maskTerms(text, c, lang) {
  const terms = new Set();
  for (const t of [c.title[lang], c.title.en]) {
    terms.add(t);
    const base = t.replace(/\s*\(.*\)\s*/, "").trim(); if (base.length > 3) terms.add(base);
    const par = t.match(/\(([^)]+)\)/); if (par && par[1].length > 3) terms.add(par[1]);
    for (const part of t.split(/\s*[:&,]\s*/)) if (part.length > 4) terms.add(part);
  }
  for (const a of c.aliases) if (a.length >= 3) terms.add(a);
  let out = text;
  for (const t of [...terms].sort((a, b) => b.length - a.length)) out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(t)}(?=$|[^\\p{L}\\p{N}])`, "giu"), "$1▢▢▢");
  return out;
}

// Diagram SVGs are fetched lazily by the "rebuild the diagram" exercise.
const pubDiagrams = path.join(ROOT, "public", "diagrams");
fs.mkdirSync(pubDiagrams, { recursive: true });
for (const id of graphs.keys()) for (const mode of ["dark", "light"]) {
  const src = path.join(DIAGRAMS, `${id}.${mode}.svg`);
  if (fs.existsSync(src)) fs.writeFileSync(path.join(pubDiagrams, `${id}.${mode}.svg`), fs.readFileSync(src, "utf8").replace(/^<!--[^>]*-->\n/, ""));
}

// Concept illustrations as small standalone SVG files, for client components (path, practice,
// search) that cannot inline them at build time. Loaded lazily, cached by the browser.
{
  const illFile = path.join(ROOT, "content", "illustrations.json");
  const pubIll = path.join(ROOT, "public", "ill");
  if (fs.existsSync(illFile)) {
    fs.mkdirSync(pubIll, { recursive: true });
    const fe = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", "@iconify-json", "fluent-emoji-flat", "icons.json"), "utf8"));
    for (const [id, name] of Object.entries(JSON.parse(fs.readFileSync(illFile, "utf8")))) {
      const icon = fe.icons[name] ?? fe.icons[fe.aliases?.[name]?.parent];
      if (!icon) continue;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width ?? fe.width ?? 32} ${icon.height ?? fe.height ?? 32}">${icon.body}</svg>`;
      fs.writeFileSync(path.join(pubIll, `${id}.svg`), svg);
    }
  }
}

const L = (v, lang) => (v && typeof v === "object" && "en" in v ? v[lang] : v);
for (const lang of ["en", "es"]) {
  const items = [];
  const meta = {};
  for (const d of domains) for (const id of d.concepts) {
    const c = concepts.get(id);
    if (!c) continue;
    meta[id] = { d: d.id, t: c.title[lang], l: c.level };
    // 1. "Which concept is this?" from the masked one-liner; distractors are siblings in the topic.
    const pool = d.concepts.filter((x) => x !== id && concepts.has(x));
    const others = pool.length >= 3 ? pool : [...pool, ...[...concepts.keys()].filter((x) => x !== id && !pool.includes(x))];
    const wrong = pick(others, 3, id + ":def");
    items.push({
      id: `${id}.def`, c: id, type: "mcq", auto: 1,
      prompt: (lang === "es" ? "¿Qué concepto describe esto?\n\n> " : "Which concept is this?\n\n> ") + maskTerms(plain(c.tldr[lang]), c, lang),
      options: [{ text: c.title[lang] }, ...wrong.map((w) => ({ text: concepts.get(w).title[lang], why: plain(concepts.get(w).tldr[lang]) }))],
      answer: 0,
      explain: plain(c.tldr[lang]),
    });
    // 2. Authored exercises.
    for (const it of authored.get(id) ?? []) {
      const o = { id: it.id, c: id, type: it.type, prompt: L(it.prompt, lang), explain: L(it.explain, lang) };
      if (it.options) o.options = it.options.map((x) => ({ text: L(x.text, lang), ...(x.why ? { why: L(x.why, lang) } : {}) }));
      for (const k of ["answer", "answers", "tolerance", "unit", "lang", "code"]) if (it[k] != null) o[k] = it[k];
      if (it.steps) o.steps = it.steps.map((x) => L(x, lang));
      if (it.pairs) o.pairs = it.pairs.map((p) => ({ left: L(p.left, lang), right: L(p.right, lang) }));
      items.push(o);
    }
    // 3. "Rebuild the diagram": blank 2-3 nodes of the real diagram; the bank adds labels from
    //    other diagrams in the same topic so it cannot be solved by elimination alone.
    const g = graphs.get(id);
    if (g && g.nodes.length >= 4) {
      const labels = new Set(g.nodes.map((n) => n.label.toLowerCase()));
      const candidates = g.nodes.filter((n) => n.label.length >= 3 && !GENERIC.test(n.label));
      const blanks = pick(candidates.length >= 2 ? candidates : g.nodes, g.nodes.length >= 7 ? 3 : 2, id + ":dg");
      const foreign = d.concepts.filter((x) => x !== id && graphs.has(x)).flatMap((x) => graphs.get(x).nodes.map((n) => n.label))
        .filter((l) => l.length >= 3 && !labels.has(l.toLowerCase()) && !GENERIC.test(l));
      const distract = pick([...new Set(foreign)], 3, id + ":dgx");
      if (blanks.length >= 2 && distract.length >= 2) items.push({
        id: `${id}.dg`, c: id, type: "diagram", auto: 1,
        prompt: lang === "es" ? "Reconstruye el diagrama: coloca cada componente en su lugar." : "Rebuild the diagram: put each component in its place.",
        blanks: blanks.map((n) => ({ node: n.id, label: n.label })),
        bank: [...blanks.map((n) => n.label), ...distract],
        explain: plain(c.diagram.caption[lang]),
      });
    }
    // 4. Interview questions: answer out loud, then rate yourself.
    c.interview.forEach((x, i) => items.push({ id: `${id}.iq${i}`, c: id, type: "recall", auto: 1, prompt: x.q[lang], answer: x.a[lang] }));
  }
  const phases = studyPath.phases.map((p) => ({ id: p.id, t: p.title[lang], g: p.goal[lang], modules: p.modules.map((m) => ({ id: m.id, t: m.title[lang], c: m.concepts.filter((x) => concepts.has(x)) })) }));
  fs.writeFileSync(path.join(outDir, `practice-${lang}.json`), JSON.stringify({ meta, phases, items }));
}

// Coding problems for the timed mock (/practice/code/mock): what the page needs to pose and run a
// problem, without hints or solutions (nor the slow `perf.naive`). Loaded lazily, only on that page.
{
  const order = new Map(domains.flatMap((d) => d.concepts).map((id, i) => [id, i]));
  const all = listProblemFiles().map((f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } })
    .filter((p) => p && concepts.has(p.concept))
    .sort((a, b) => (order.get(a.concept) ?? 0) - (order.get(b.concept) ?? 0) || a.id.localeCompare(b.id));
  // The mock gives no hints, so the starter's approach comment goes; the "# ---" section markers stay.
  const noHints = (src) => src.split("\n").filter((l) => !/^\s*#(?! ---)/.test(l)).join("\n");
  for (const lang of ["en", "es"]) {
    fs.writeFileSync(path.join(outDir, `problems-${lang}.json`), JSON.stringify(all.map((p) => ({
      id: p.id, c: p.concept, ct: concepts.get(p.concept).title[lang], d: p.difficulty, t: p.title[lang], prompt: p.prompt[lang],
      fn: p.fn, starter: noHints(p.starter), tests: p.tests, compare: p.compare ?? "exact",
      ...(p.perf ? { perf: { gen: p.perf.gen, sha: p.perf.sha, limitMs: p.perf.limitMs, size: p.perf.size[lang] } } : {}),
    }))));
  }
}

// The Gym's "explain it cold" reps: each concept's title and key points, in study-path order, as
// plain text (the reader ticks which points their own explanation covered). Lazy, gym page only.
{
  const order = studyPath.phases.flatMap((p) => p.modules.flatMap((m) => m.concepts)).filter((id) => concepts.has(id));
  const md = (x) => plain(x).replace(/\*\*/g, "");
  for (const lang of ["en", "es"]) {
    fs.writeFileSync(path.join(outDir, `gym-${lang}.json`), JSON.stringify(order.map((id) => {
      const c = concepts.get(id);
      return { id, t: c.title[lang], kp: (c.keyPoints ?? []).map((k) => md(k[lang])) };
    })));
  }
}

warnings.forEach((w) => console.log("warn:", w));
if (errors.length) { errors.forEach((e) => console.log("ERROR:", e)); console.log(`\ncontent: ${errors.length} error(s)`); process.exit(1); }
const total = domains.reduce((n, d) => n + d.concepts.length, 0);
console.log(`content: ${concepts.size}/${total} concepts valid, ${authored.size} with authored exercises, indexes written to src/generated/`);
