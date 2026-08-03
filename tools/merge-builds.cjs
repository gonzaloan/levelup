#!/usr/bin/env node
/**
 * Validating merge for Architecture Builder challenges.
 *
 * WHY THIS DID NOT EXIST, AND WHY THAT MATTERED
 * Every other content file has one — merge-domain, merge-lessons, merge-codex,
 * merge-checks — and `builds.json` did not. It was also the file the glossary scanner
 * was not reading, and the two gaps compounded: a build challenge shipped
 * "pipeline de trozeo y embebido" (a calque of `chunking`) through a file with no front
 * door and no terminology check.
 *
 * WHAT IT REFUSES
 * The grader in src/lib/build.ts scores three things — required node types present,
 * required directed edges present, forbidden edges absent — and treats a build as
 * correct only when EVERY criterion passes. So the defects that matter are the ones
 * that make a challenge ungradeable or trivially passable:
 *
 *   • an edge naming a type the palette does not offer (unsatisfiable: the learner
 *     cannot place a node that is not in the palette, so the criterion can never pass)
 *   • a required node type absent from the palette (same)
 *   • a forbidden edge that is also required (contradictory)
 *   • fewer than 2 required criteria (nothing to construct)
 *   • a palette entry no criterion mentions (a decoy with no purpose — warned, not
 *     failed, since a plausible distractor is legitimate)
 *   • no forbidden edge at all (warned: a challenge that only rewards adding things
 *     teaches assembly, not judgment)
 *   • a duplicate id, or a `concept` slug the spine does not have
 *   • missing/untranslated i18n on any learner-facing field
 *   • a banned rendering from the glossary
 *
 * The last one is the point. This is the only merge tool that checks terminology
 * directly, because it was written after the file it guards was found exempt.
 *
 * Usage: node tools/merge-builds.cjs --check
 *        node tools/merge-builds.cjs research/build-patch-ai.json [--dry-run]
 */
const fs = require("node:fs");
const path = require("node:path");
const { corpus, count, wordRe } = require("./glossary-scan.cjs");

const ROOT = path.join(__dirname, "..");
const BUILDS = path.join(ROOT, "src/content/data/builds.json");
const SPINE = path.join(ROOT, "src/content/data/curriculum.json");
const GLOSSARY = path.join(ROOT, "content/glossary.en.json");

const errs = [];
const warns = [];
const bad = (m) => errs.push(m);

const isI18n = (v) => !!v && typeof v.en === "string" && typeof v.es === "string";

/** A learner-facing string must exist in both languages and be really translated. */
function checkI18n(v, where, { min = 1, sameOk = false } = {}) {
  if (!isI18n(v)) return bad(`${where}: not an {en,es} pair`);
  for (const lang of ["en", "es"]) {
    const s = v[lang].trim();
    if (!s) return bad(`${where}.${lang}: empty`);
    if (s.length < min) bad(`${where}.${lang}: shorter than ${min} chars`);
  }
  // A short label may legitimately match ("LLM", "429/503"); prose may not.
  if (!sameOk && v.en.trim() === v.es.trim() && v.en.trim().split(/\s+/).length > 2) {
    bad(`${where}: identical in both languages — untranslated`);
  }
}

/** Banned terminology, straight from the generated glossary. */
function checkTerminology(challenge, where) {
  if (!fs.existsSync(GLOSSARY)) return;
  const glossary = JSON.parse(fs.readFileSync(GLOSSARY, "utf8"));
  const es = [];
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string") { if (k === "es") es.push(v); } else walk(v);
    }
  };
  walk(challenge);
  const text = es.join("\n");
  for (const term of glossary.terms) {
    for (const banned of term.avoid) {
      if (wordRe(banned, "i").test(text)) {
        bad(`${where}: uses "${banned}", banned for ${term.term} — use "${term.spanish_usage}"`);
      }
    }
  }
}

function checkChallenge(b, where, spineSlugs, seenIds) {
  if (!b.id || typeof b.id !== "string") return bad(`${where}: missing id`);
  if (seenIds.has(b.id)) bad(`${where}: duplicate id ${b.id}`);
  seenIds.add(b.id);

  if (!spineSlugs.has(b.concept)) {
    bad(`${where}: concept "${b.concept}" is not a spine concept`);
  }
  if (!["general", "ai"].includes(b.track)) bad(`${where}: track must be general or ai`);

  checkI18n(b.title, `${where}.title`, { min: 10 });
  checkI18n(b.prompt, `${where}.prompt`, { min: 60 });
  checkI18n(b.explain, `${where}.explain`, { min: 80 });

  // ── palette ──
  if (!Array.isArray(b.palette) || b.palette.length < 3) {
    return bad(`${where}.palette: needs >=3 components, or there is no choice to make`);
  }
  const types = new Set();
  for (const [i, p] of b.palette.entries()) {
    if (!p.type) { bad(`${where}.palette[${i}]: missing type`); continue; }
    if (types.has(p.type)) bad(`${where}.palette[${i}]: duplicate type "${p.type}"`);
    types.add(p.type);
    checkI18n(p.label, `${where}.palette[${i}].label`, { sameOk: true });
    if (p.hint !== undefined) checkI18n(p.hint, `${where}.palette[${i}].hint`);
  }

  // ── criteria: every type referenced must be placeable ──
  const referenced = new Set();
  if (!Array.isArray(b.requiredNodes) || !b.requiredNodes.length) {
    bad(`${where}.requiredNodes: needs >=1`);
  }
  for (const [i, n] of (b.requiredNodes ?? []).entries()) {
    if (!types.has(n.type)) {
      // The unsatisfiable-criterion defect: the learner cannot place what the palette
      // does not offer, so this criterion can never pass and the build can never be
      // fully correct — which is how the checkpoint gate scores it.
      bad(`${where}.requiredNodes[${i}]: type "${n.type}" is not in the palette`);
    }
    referenced.add(n.type);
    if (n.min !== undefined && (!Number.isInteger(n.min) || n.min < 1)) {
      bad(`${where}.requiredNodes[${i}].min: must be a positive integer`);
    }
    if (n.note !== undefined) checkI18n(n.note, `${where}.requiredNodes[${i}].note`);
  }

  const edgeKey = (e) => `${e.from}->${e.to}`;
  const required = new Set();
  for (const [i, e] of (b.requiredEdges ?? []).entries()) {
    for (const end of ["from", "to"]) {
      if (!types.has(e[end])) bad(`${where}.requiredEdges[${i}].${end}: "${e[end]}" is not in the palette`);
      referenced.add(e[end]);
    }
    if (e.from === e.to) bad(`${where}.requiredEdges[${i}]: self-edge`);
    if (required.has(edgeKey(e))) bad(`${where}.requiredEdges[${i}]: duplicate edge ${edgeKey(e)}`);
    required.add(edgeKey(e));
    checkI18n(e.note, `${where}.requiredEdges[${i}].note`, { min: 20 });
  }

  for (const [i, e] of (b.forbiddenEdges ?? []).entries()) {
    for (const end of ["from", "to"]) {
      if (!types.has(e[end])) bad(`${where}.forbiddenEdges[${i}].${end}: "${e[end]}" is not in the palette`);
      referenced.add(e[end]);
    }
    if (required.has(edgeKey(e))) {
      bad(`${where}.forbiddenEdges[${i}]: ${edgeKey(e)} is also required — contradictory`);
    }
    checkI18n(e.note, `${where}.forbiddenEdges[${i}].note`, { min: 20 });
  }

  const criteria = (b.requiredNodes?.length ?? 0) + (b.requiredEdges?.length ?? 0) + (b.forbiddenEdges?.length ?? 0);
  if (criteria < 2) bad(`${where}: only ${criteria} criterion — nothing to construct`);

  // ── warnings: shape, not correctness ──
  if (!b.forbiddenEdges?.length) {
    warns.push(`${where}: no forbidden edge — the challenge rewards assembly, not judgment`);
  }
  for (const t of types) {
    if (!referenced.has(t)) warns.push(`${where}: palette type "${t}" appears in no criterion (decoy)`);
  }

  checkTerminology(b, where);
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const dry = args.includes("--dry-run");
  const inputs = args.filter((a) => !a.startsWith("--"));

  const spine = JSON.parse(fs.readFileSync(SPINE, "utf8"));
  const spineSlugs = new Set(
    spine.domains.flatMap((d) => d.levels.flatMap((l) => l.concepts.map((c) => c.slug)))
  );
  const data = JSON.parse(fs.readFileSync(BUILDS, "utf8"));
  const list = data.builds ?? data;

  if (checkOnly) {
    const seen = new Set();
    for (const b of list) checkChallenge(b, b.id ?? "(no id)", spineSlugs, seen);
  } else {
    if (!inputs.length) { console.error("usage: node tools/merge-builds.cjs <patch.json> [--dry-run]"); process.exit(2); }
    const byId = new Map(list.map((b) => [b.id, b]));
    for (const f of inputs) {
      const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
      if (!fs.existsSync(p)) { bad(`input not found: ${f}`); continue; }
      const incoming = JSON.parse(fs.readFileSync(p, "utf8")).builds ?? [];
      if (!incoming.length) { bad(`${f}: no builds`); continue; }
      for (const b of incoming) {
        const before = errs.length;
        // Validated against the ids ALREADY present, minus itself, so replacing a
        // challenge is legal and colliding with a different one is not.
        const seen = new Set([...byId.keys()].filter((id) => id !== b.id));
        checkChallenge(b, b.id ?? "(no id)", spineSlugs, seen);
        if (errs.length > before) continue;   // rejected — do not stage it
        const replaced = byId.has(b.id);
        byId.set(b.id, b);
        const criteria = (b.requiredNodes?.length ?? 0) + (b.requiredEdges?.length ?? 0) + (b.forbiddenEdges?.length ?? 0);
        console.log(`  ${replaced ? "replaced" : "added"} ${b.id} (${b.palette.length} palette, ${criteria} criteria)`);
      }
    }
    // Validate the WHOLE result, not just the patch. A corrupt pre-existing entry used
    // to survive a merge of a valid one and be written straight back out, so the tool
    // produced a file its own --check mode rejects.
    if (!errs.length) {
      const merged = [...byId.values()];
      const seenAll = new Set();
      for (const b of merged) checkChallenge(b, b.id ?? "(no id)", spineSlugs, seenAll);
      if (!errs.length) data.builds = merged;
    }
  }

  if (warns.length) { console.log(`\n${warns.length} warning(s):`); for (const w of warns.slice(0, 20)) console.log("  ! " + w); }
  if (errs.length) {
    console.error(`\n${errs.length} error(s):`);
    for (const e of errs.slice(0, 40)) console.error("  ✗ " + e);
    console.error(checkOnly ? "" : "\n✗ refusing to write builds.json.");
    process.exit(1);
  }
  if (checkOnly) { console.log(`✓ ${list.length} build challenge(s) valid.`); return; }
  if (dry) { console.log(`\n✓ dry run: would write ${data.builds.length} challenge(s).`); return; }
  fs.writeFileSync(BUILDS, JSON.stringify(data), "utf8");
  console.log(`✓ wrote builds.json: ${data.builds.length} challenge(s)`);
}

if (require.main === module) main();
module.exports = { checkChallenge };
