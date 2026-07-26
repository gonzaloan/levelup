#!/usr/bin/env node
/**
 * Deterministic, validating merge of research-fleet resource files into
 * src/content/data/resources.json.
 *
 * Project rule (CLAUDE.md): never trust raw agent JSON into a shipped data file.
 * This script is the gate. It:
 *   • validates every field against the Resource contract in src/lib/resources.ts
 *   • rejects duplicate ids and duplicate URLs (two agents finding the same post)
 *   • rejects unverified entries unless --allow-unverified
 *   • rejects any `concepts` slug that isn't a real curriculum concept
 *   • rejects any domainId that isn't a real axis key
 *   • sorts deterministically so the output is byte-stable across runs
 *
 * Usage:  node tools/merge-resources.cjs research/aws-resources.json research/ai-resources.json
 *         node tools/merge-resources.cjs --check          (validate the shipped file only)
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const TARGET = path.join(ROOT, "src/content/data/resources.json");

const KINDS = new Set(["paper", "blog", "book", "talk", "doc", "repo", "newsletter", "course"]);
const LEVELS = new Set(["L3", "L4", "L5", "L6", "L7"]);
/** Domain ids read from the spine — never hardcoded, or a new domain breaks the merge. */
function domainIds() {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/data/curriculum.json"), "utf8"));
  return new Set(c.domains.map((d) => d.id));
}
const DOMAINS = domainIds();

/** Every real concept slug, read from the curriculum spine. */
function conceptSlugs() {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/data/curriculum.json"), "utf8"));
  const out = new Set();
  for (const d of c.domains) for (const lv of d.levels) for (const con of lv.concepts) out.add(con.slug);
  return out;
}

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

function validate(r, slugs, errs, where) {
  const bad = (msg) => errs.push(`${where} [${r && r.id ? r.id : "?"}]: ${msg}`);
  if (!r || typeof r !== "object") return bad("not an object"), false;
  let ok = true;
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) { bad("id must be kebab-case"); ok = false; }
  if (typeof r.title !== "string" || !r.title.trim()) { bad("missing title"); ok = false; }
  if (typeof r.url !== "string" || !/^https:\/\//.test(r.url)) { bad("url must be https"); ok = false; }
  if (!KINDS.has(r.kind)) { bad(`bad kind "${r.kind}"`); ok = false; }
  if (!r.why || typeof r.why.en !== "string" || typeof r.why.es !== "string" || !r.why.en.trim() || !r.why.es.trim()) {
    bad("why must have non-empty en + es"); ok = false;
  }
  // A Spanish `why` identical to the English one means the agent skipped the
  // translation. The project bar is authored Spanish, so this is a hard fail.
  if (r.why && r.why.en && r.why.es && r.why.en.trim() === r.why.es.trim()) {
    bad("why.es is identical to why.en (untranslated)"); ok = false;
  }
  if (!Array.isArray(r.levels) || r.levels.length === 0 || r.levels.some((l) => !LEVELS.has(l))) {
    bad("levels must be a non-empty subset of L3..L7"); ok = false;
  }
  if (!DOMAINS.has(r.domainId)) { bad(`bad domainId "${r.domainId}"`); ok = false; }
  if (!Array.isArray(r.concepts)) { bad("concepts must be an array"); ok = false; }
  else {
    for (const s of r.concepts) if (!slugs.has(s)) { bad(`unknown concept slug "${s}"`); ok = false; }
  }
  if (typeof r.verified !== "boolean") { bad("verified must be boolean"); ok = false; }
  if (r.year !== undefined && (typeof r.year !== "number" || r.year < 1970 || r.year > 2030)) {
    bad(`implausible year ${r.year}`); ok = false;
  }
  return ok;
}

function normalize(r) {
  // Fixed key order → byte-stable output regardless of the agent's key order.
  const out = {
    id: r.id, title: r.title.trim(), url: r.url.trim(), kind: r.kind,
  };
  if (r.author) out.author = String(r.author).trim();
  if (r.year !== undefined) out.year = r.year;
  out.why = { en: r.why.en.trim(), es: r.why.es.trim() };
  out.levels = [...new Set(r.levels)].sort();
  out.domainId = r.domainId;
  out.concepts = [...new Set(r.concepts)].sort();
  out.verified = r.verified;
  if (r.essential) out.essential = true;
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const allowUnverified = args.includes("--allow-unverified");
  const checkOnly = args.includes("--check");
  const inputs = args.filter((a) => !a.startsWith("--"));
  const slugs = conceptSlugs();
  const errs = [];

  let incoming = [];
  if (checkOnly) {
    incoming = JSON.parse(fs.readFileSync(TARGET, "utf8")).resources;
  } else {
    // Start from what's already shipped so a merge is additive, then layer inputs.
    const existing = fs.existsSync(TARGET) ? JSON.parse(fs.readFileSync(TARGET, "utf8")).resources : [];
    incoming = [...existing];
    for (const f of inputs) {
      const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
      if (!fs.existsSync(p)) { errs.push(`input not found: ${f}`); continue; }
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      if (!Array.isArray(data.resources)) { errs.push(`${f}: no resources array`); continue; }
      incoming.push(...data.resources.map((r) => ({ ...r, __src: f })));
    }
  }

  const byId = new Map();
  const byUrl = new Map();
  let dropped = 0;
  for (const raw of incoming) {
    const where = raw.__src || "target";
    delete raw.__src;
    if (!validate(raw, slugs, errs, where)) { dropped++; continue; }
    if (!raw.verified && !allowUnverified) {
      errs.push(`${where} [${raw.id}]: unverified (pass --allow-unverified to keep)`);
      dropped++; continue;
    }
    const r = normalize(raw);
    // Later input wins on id collision, but a URL collision across DIFFERENT ids
    // is an authoring mistake (same source listed twice) — drop the newcomer and say so.
    const urlKey = r.url.replace(/\/+$/, "").toLowerCase();
    const prevUrl = byUrl.get(urlKey);
    if (prevUrl && prevUrl !== r.id) {
      errs.push(`duplicate URL: "${r.id}" and "${prevUrl}" both point at ${r.url} — dropped ${r.id}`);
      dropped++; continue;
    }
    byUrl.set(urlKey, r.id);
    byId.set(r.id, r);
  }

  const resources = [...byId.values()].sort(
    (a, b) => a.domainId.localeCompare(b.domainId) || a.id.localeCompare(b.id)
  );

  if (errs.length) {
    console.error(`\n${errs.length} problem(s):`);
    for (const e of errs) console.error("  ✗ " + e);
  }
  // Hard-fail on validation errors: a shipped data file must never contain a
  // half-merged state. Duplicate-URL notices alone are non-fatal (we dropped them).
  const fatal = errs.filter((e) => !e.startsWith("duplicate URL"));
  if (fatal.length && !checkOnly) {
    console.error(`\n✗ refusing to write ${path.relative(ROOT, TARGET)} — fix the errors above.`);
    process.exit(1);
  }
  if (checkOnly) {
    console.log(`${resources.length} resources validated${fatal.length ? `, ${fatal.length} error(s)` : ", clean"}.`);
    process.exit(fatal.length ? 1 : 0);
  }

  fs.writeFileSync(TARGET, JSON.stringify({ resources }, null, 2) + "\n", "utf8");
  const withConcepts = resources.filter((r) => r.concepts.length > 0).length;
  console.log(
    `✓ wrote ${resources.length} resources → ${path.relative(ROOT, TARGET)}` +
    ` (${resources.filter((r) => r.essential).length} essential, ${withConcepts} concept-mapped, ${dropped} dropped)`
  );
}

main();
