#!/usr/bin/env node
/**
 * Merge a new domain (and/or new levels of an existing domain) into the
 * curriculum spine, with validation. Same rule as every other content merge in
 * this repo: agent/author output never lands in a shipped data file unvalidated.
 *
 * Validates: unique slugs across the WHOLE spine; bilingual title/why/intent;
 * prerequisites resolve to real slugs *within the same domain*; no prerequisite
 * cycles; no forward references to a higher level; every concept has a source.
 *
 * Usage: node tools/merge-domain.cjs research/cloud-domain.json
 *        node tools/merge-domain.cjs --check      (validate the shipped spine)
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SPINE = path.join(ROOT, "src/content/data/curriculum.json");
const LEVELS = ["L3", "L4", "L5", "L6", "L7"];

const errs = [];
const bad = (m) => errs.push(m);

function i18nOk(v) {
  return v && typeof v.en === "string" && typeof v.es === "string" && v.en.trim() && v.es.trim();
}

/** Validate one domain object in isolation + against the rest of the spine. */
function validateDomain(dom, otherSlugs) {
  if (typeof dom.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(dom.id)) bad(`domain id invalid: ${dom.id}`);
  if (!Number.isInteger(dom.axisId) || dom.axisId < 1 || dom.axisId > 7) bad(`${dom.id}: axisId must be 1..7`);
  if (!Array.isArray(dom.levels) || dom.levels.length === 0) return bad(`${dom.id}: no levels`);

  const own = new Map(); // slug -> level index, for prerequisite checks
  for (const lv of dom.levels) {
    if (!LEVELS.includes(lv.level)) bad(`${dom.id}: bad level "${lv.level}"`);
    if (!i18nOk(lv.intent)) bad(`${dom.id}/${lv.level}: intent must be bilingual`);
    if (!Array.isArray(lv.concepts) || lv.concepts.length === 0) bad(`${dom.id}/${lv.level}: no concepts`);
    for (const c of lv.concepts ?? []) {
      if (typeof c.slug !== "string" || !/^[a-z][a-z0-9-]*$/.test(c.slug)) { bad(`${dom.id}/${lv.level}: bad slug "${c.slug}"`); continue; }
      if (own.has(c.slug)) bad(`${dom.id}: duplicate slug "${c.slug}" within the domain`);
      if (otherSlugs.has(c.slug)) bad(`${dom.id}: slug "${c.slug}" already exists elsewhere in the spine`);
      own.set(c.slug, LEVELS.indexOf(lv.level));
      if (!i18nOk(c.title)) bad(`${c.slug}: title must be bilingual`);
      if (!i18nOk(c.why)) bad(`${c.slug}: why must be bilingual`);
      if (c.why && c.why.en && c.why.es && c.why.en.trim() === c.why.es.trim()) bad(`${c.slug}: why.es is untranslated`);
      if (typeof c.source !== "string" || c.source.trim().length < 8) bad(`${c.slug}: needs a real source`);
      if (!Array.isArray(c.prerequisites)) bad(`${c.slug}: prerequisites must be an array`);
      // The project's ES voice rules.
      const banned = /\blibrer[íi]as?\b|\brobust[oa]s?\b|\brobustez\b|\bcorrectitud\b|\beventualmente\b(?!\s+consistente)/i;
      for (const [k, v] of [["title", c.title], ["why", c.why]]) {
        if (v && v.es && banned.test(v.es)) bad(`${c.slug}: banned calque in ${k}.es`);
      }
    }
  }

  // Prerequisites: must exist in this domain, and must not point UP a level
  // (a prerequisite you haven't unlocked yet would deadlock the daily brief).
  for (const lv of dom.levels) {
    for (const c of lv.concepts ?? []) {
      for (const p of c.prerequisites ?? []) {
        if (!own.has(p)) { bad(`${c.slug}: prerequisite "${p}" not found in domain ${dom.id}`); continue; }
        if (own.get(p) > LEVELS.indexOf(lv.level)) bad(`${c.slug}: prerequisite "${p}" sits at a HIGHER level`);
      }
    }
  }

  // Cycle detection over the within-domain prerequisite DAG.
  const graph = new Map();
  for (const lv of dom.levels) for (const c of lv.concepts ?? []) graph.set(c.slug, c.prerequisites ?? []);
  const state = new Map();
  const walk = (n, trail) => {
    if (state.get(n) === "done") return;
    if (state.get(n) === "open") return bad(`prerequisite cycle: ${[...trail, n].join(" → ")}`);
    state.set(n, "open");
    for (const p of graph.get(n) ?? []) if (graph.has(p)) walk(p, [...trail, n]);
    state.set(n, "done");
  };
  for (const n of graph.keys()) walk(n, []);
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const inputs = args.filter((a) => !a.startsWith("--"));
  const spine = JSON.parse(fs.readFileSync(SPINE, "utf8"));

  if (checkOnly) {
    for (const dom of spine.domains) {
      const others = new Set();
      for (const d of spine.domains) if (d.id !== dom.id) for (const lv of d.levels) for (const c of lv.concepts) others.add(c.slug);
      validateDomain(dom, others);
    }
    const total = spine.domains.reduce((a, d) => a + d.levels.reduce((b, l) => b + l.concepts.length, 0), 0);
    if (errs.length) { for (const e of errs) console.error("  ✗ " + e); process.exit(1); }
    console.log(`✓ spine clean: ${spine.domains.length} domains, ${total} concepts, ${spine.checkpoints.length} checkpoints`);
    return;
  }

  for (const f of inputs) {
    const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
    const incoming = JSON.parse(fs.readFileSync(p, "utf8")).domain;
    if (!incoming) { bad(`${f}: no "domain" key`); continue; }
    const existingIdx = spine.domains.findIndex((d) => d.id === incoming.id);
    // Slugs owned by every OTHER domain (so re-running a merge on the same file
    // doesn't flag the domain's own slugs as duplicates — idempotent).
    const others = new Set();
    for (const d of spine.domains) {
      if (d.id === incoming.id) continue;
      for (const lv of d.levels) for (const c of lv.concepts) others.add(c.slug);
    }
    validateDomain(incoming, others);
    if (errs.length) continue;
    if (existingIdx >= 0) spine.domains[existingIdx] = incoming;
    else spine.domains.push(incoming);
    console.log(`  ${existingIdx >= 0 ? "replaced" : "added"} domain ${incoming.id} (${incoming.levels.reduce((a, l) => a + l.concepts.length, 0)} concepts)`);
  }

  if (errs.length) {
    console.error(`\n${errs.length} problem(s):`);
    for (const e of errs) console.error("  ✗ " + e);
    console.error("\n✗ refusing to write curriculum.json.");
    process.exit(1);
  }

  fs.writeFileSync(SPINE, JSON.stringify(spine, null, 1) + "\n", "utf8");
  const total = spine.domains.reduce((a, d) => a + d.levels.reduce((b, l) => b + l.concepts.length, 0), 0);
  console.log(`✓ wrote spine: ${spine.domains.length} domains, ${total} concepts`);
}

main();
