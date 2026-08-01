#!/usr/bin/env node
/**
 * Rewrite a concept's `why` line in the curriculum spine.
 *
 * The `why` is the first sentence on a concept pane, and all six in
 * cloud-platform-l5 opened with "Trains the judgment of…" — the curriculum
 * designer's voice, addressed to whoever writes the lesson, not to the learner.
 * The owner's review put it plainly: it presumes the concept inside the sentence
 * meant to introduce it.
 *
 * Rewriting it is a content edit to a 200KB spine, so it goes through a tool:
 * exact-match on the old text (so a drifted spine fails loudly instead of being
 * silently patched), bilingual, and re-validated by merge-domain afterwards.
 *
 * Input: { "patches": [ { "slug": "...", "from": "...", "why": {en, es} } ] }
 * Usage: node tools/patch-why.cjs research/rewrite/why.json [--dry-run]
 */
const fs = require("node:fs");
const path = require("node:path");

const SPINE = path.join(__dirname, "..", "src/content/data/curriculum.json");

function main() {
  const dry = process.argv.includes("--dry-run");
  const input = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!input) { console.error("usage: node tools/patch-why.cjs <patch.json> [--dry-run]"); process.exit(2); }

  const spine = JSON.parse(fs.readFileSync(SPINE, "utf8"));
  const patches = JSON.parse(fs.readFileSync(path.resolve(input), "utf8")).patches ?? [];
  const errs = [];
  let applied = 0;

  // Flatten once: a slug is unique across the whole spine (merge-domain enforces it).
  const bySlug = new Map();
  for (const d of spine.domains) for (const b of d.levels) for (const c of b.concepts) bySlug.set(c.slug, c);

  for (const p of patches) {
    const c = bySlug.get(p.slug);
    if (!c) { errs.push(`${p.slug}: no such concept in the spine`); continue; }
    if (!p.why?.en || !p.why?.es) { errs.push(`${p.slug}: why must be {en, es}`); continue; }
    if (p.why.en.trim() === p.why.es.trim()) { errs.push(`${p.slug}: why.es is untranslated`); continue; }
    // Exact-match guard: if the spine already moved on, patching blind would
    // overwrite someone else's edit.
    if (p.from && c.why?.en?.trim() !== p.from.trim()) {
      errs.push(`${p.slug}: current why does not match \`from\` — spine has drifted, re-read it`);
      continue;
    }
    c.why = p.why;
    applied++;
    console.log(`  ~ ${p.slug}: ${p.why.en.slice(0, 68)}…`);
  }

  if (errs.length) {
    console.error(`\n${errs.length} error(s):`);
    for (const e of errs) console.error("  ✗ " + e);
    console.error("\n✗ refusing to write curriculum.json.");
    process.exit(1);
  }
  if (dry) { console.log(`\n✓ dry run: ${applied} why line(s) would change.`); return; }
  fs.writeFileSync(SPINE, JSON.stringify(spine), "utf8");
  console.log(`\n✓ wrote curriculum.json: ${applied} why line(s)`);
}

main();
