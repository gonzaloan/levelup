#!/usr/bin/env node
// The content gate + generator. Validates every concept, checks the pre-rendered diagrams are
// fresh, and writes the client-side search / practice indexes to src/generated/.
// Usage: node tools/build-content.mjs [--allow-missing]   (runs automatically before dev/build)
import fs from "node:fs";
import path from "node:path";
import { loadDomains, listConceptFiles, validateConcept, conceptPath, diagramHash, readDiagramHash, DIAGRAMS, ROOT } from "./content-lib.mjs";

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
  for (const mode of ["dark", "light"]) {
    if (readDiagramHash(path.join(DIAGRAMS, `${c.id}.${mode}.svg`)) !== h) (allowMissing ? warnings : errors).push(`${c.id}: diagram not rendered or stale — run npm run diagrams`);
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
  const search = [], qa = [];
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
    c.interview.forEach((x, i) => qa.push({ k: `${id}#${i}`, id, d: d.id, t: c.title[lang], q: x.q[lang], a: x.a[lang] }));
  }
  fs.writeFileSync(path.join(outDir, `search-${lang}.json`), JSON.stringify(search));
  fs.writeFileSync(path.join(outDir, `qa-${lang}.json`), JSON.stringify(qa));
}

warnings.forEach((w) => console.log("warn:", w));
if (errors.length) { errors.forEach((e) => console.log("ERROR:", e)); console.log(`\ncontent: ${errors.length} error(s)`); process.exit(1); }
const total = domains.reduce((n, d) => n + d.concepts.length, 0);
console.log(`content: ${concepts.size}/${total} concepts valid, indexes written to src/generated/`);
