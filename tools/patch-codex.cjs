#!/usr/bin/env node
/**
 * Surgical field patcher for authored Codex batch files.
 *
 * Why this exists rather than editing the batch files by hand: the authoring
 * fleet writes 4-5 entries per file and a validator rejects the file on any
 * defect, so repairs arrive as a list of (file, entry, field-path, value). Doing
 * that with an editor is how a 300-line JSON file loses an unrelated entry.
 *
 * The first pass needed it immediately: 20 of 25 authored diagrams omitted
 * `diagram.caption` (the field is required, and the contract showed it without
 * flagging it). A caption cannot be generated mechanically — it has to ASSERT
 * something about the figure — so the value comes from an agent and this script
 * only places it, at an exact path, on an entry that must already exist.
 *
 * Input:
 *   { "patches": [
 *       { "file": "ck-3", "slug": "late-chunking",
 *         "path": "diagram.caption", "value": { "en": "…", "es": "…" } }
 *   ] }
 *
 * `path` is a dotted path with optional [i] indices, resolved against the entry
 * (or against the architecture, for an architectures file). Every path segment
 * before the last must already exist — this patcher fills a hole, it does not
 * invent structure, because inventing structure is how a diagram ends up with a
 * shape its `kind` does not render.
 *
 * Usage: node tools/patch-codex.cjs research/codex/_repair.json [--dry-run]
 */
const fs = require("node:fs");
const path = require("node:path");

const DIR = path.join(__dirname, "..", "research/codex");

/** Resolve a dotted/indexed path to [container, finalKey]. */
function resolve(root, dotted, where, errs) {
  const parts = [];
  for (const seg of dotted.split(".")) {
    const m = /^([A-Za-z0-9_]+)((\[\d+\])*)$/.exec(seg);
    if (!m) { errs.push(`${where}: unparseable path segment "${seg}"`); return null; }
    parts.push(m[1]);
    for (const idx of m[2].matchAll(/\[(\d+)\]/g)) parts.push(Number(idx[1]));
  }
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur === null || typeof cur !== "object" || !(k in cur)) {
      errs.push(`${where}: path "${dotted}" does not exist (stopped at "${k}") — this patcher fills a hole, it does not invent structure`);
      return null;
    }
    cur = cur[k];
  }
  return [cur, parts[parts.length - 1]];
}

function main() {
  const dry = process.argv.includes("--dry-run");
  const input = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!input) { console.error("usage: node tools/patch-codex.cjs <repair.json> [--dry-run]"); process.exit(2); }

  const patches = JSON.parse(fs.readFileSync(path.resolve(input), "utf8")).patches ?? [];
  const errs = [];
  // Group by file so each batch file is read once and written once.
  const byFile = new Map();
  for (const p of patches) {
    (byFile.get(p.file) ?? byFile.set(p.file, []).get(p.file)).push(p);
  }

  let applied = 0;
  const writes = new Map();

  for (const [file, list] of byFile) {
    const fp = path.join(DIR, `${file}.json`);
    if (!fs.existsSync(fp)) { errs.push(`${file}: no such batch file at ${fp}`); continue; }
    let data;
    try { data = JSON.parse(fs.readFileSync(fp, "utf8")); }
    catch (e) { errs.push(`${file}: invalid JSON — ${e.message}`); continue; }

    const items = Array.isArray(data.entries) ? data.entries
      : Array.isArray(data.architectures) ? data.architectures
      : null;
    if (!items) { errs.push(`${file}: neither {entries} nor {architectures}`); continue; }

    for (const p of list) {
      const where = `${file}/${p.slug}.${p.path}`;
      const item = items.find((x) => x.slug === p.slug);
      if (!item) { errs.push(`${where}: no entry with that slug in ${file}.json`); continue; }
      if (p.value === undefined) { errs.push(`${where}: patch has no value`); continue; }
      // A bilingual value must actually be bilingual, and translated. Catching it
      // here rather than at merge time keeps the repair loop one step long.
      if (p.value && typeof p.value === "object" && "en" in p.value) {
        if (typeof p.value.en !== "string" || typeof p.value.es !== "string") {
          errs.push(`${where}: value is not an {en,es} pair`); continue;
        }
        if (p.value.en.trim() === p.value.es.trim()) {
          errs.push(`${where}: es is identical to en`); continue;
        }
      }
      const r = resolve(item, p.path, where, errs);
      if (!r) continue;
      const [container, key] = r;
      container[key] = p.value;
      applied++;
      const shown = p.value?.en ?? JSON.stringify(p.value);
      console.log(`  ~ ${where}: ${String(shown).slice(0, 70)}…`);
    }
    writes.set(fp, data);
  }

  if (errs.length) {
    console.error(`\n${errs.length} error(s):`);
    for (const e of errs) console.error("  ✗ " + e);
    console.error("\n✗ refusing to write anything.");
    process.exit(1);
  }
  if (dry) { console.log(`\n✓ dry run: ${applied} patch(es) would apply across ${writes.size} file(s).`); return; }
  for (const [fp, data] of writes) fs.writeFileSync(fp, JSON.stringify(data, null, 1), "utf8");
  console.log(`\n✓ ${applied} patch(es) applied across ${writes.size} file(s)`);
}

main();
