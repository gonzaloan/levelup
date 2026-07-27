#!/usr/bin/env node
/**
 * Surgical merge: replace ONE named field on an existing concept.
 *
 * Why this exists separately from merge-lessons.cjs: that script takes whole
 * lessons and replaces them wholesale, which is right when authoring a band
 * from scratch but wrong here. 33 concepts need an artifact added; asking an
 * agent to re-emit the full 6-concept lesson to add one snippet risks losing
 * hand-fixed prose, Spanish corrections, and quiz rationales. This patcher
 * touches exactly the named field and refuses to do anything else.
 *
 * It reuses merge-lessons' validator, so a snippet has to satisfy the same
 * rules (bilingual captions, annotation line numbers in range, no calques) as
 * anything that arrives through the front door.
 *
 * Input shape — `field` defaults to "code", for the patches written before it
 * was configurable:
 *   { "patches": [ { "lessonId": "...", "slug": "...", "field": "architecture",
 *                    "architecture": {...} } ] }
 *
 * Refuses to overwrite an existing value unless --force, because silently
 * replacing authored content is exactly the kind of loss this avoids.
 *
 * Usage: node tools/merge-code.cjs research/code-patch-cloud.json [--force]
 *        node tools/merge-code.cjs --dry-run <file>
 */
const fs = require("node:fs");
const path = require("node:path");
const { checkConcept, widgetIds, errs, warns } = require("./merge-lessons.cjs");

const ROOT = path.join(__dirname, "..");
const LESSONS = path.join(ROOT, "src/content/data/lessons.json");

/** Fields checkConcept validates, and therefore the only ones we will write. */
const PATCHABLE = new Set(["code", "architecture", "diagram", "example"]);

function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dry = args.includes("--dry-run");
  const inputs = args.filter((a) => !a.startsWith("--"));
  if (!inputs.length) {
    console.error("usage: node tools/merge-code.cjs <patch.json…> [--force] [--dry-run]");
    process.exit(2);
  }

  const data = JSON.parse(fs.readFileSync(LESSONS, "utf8"));
  const ids = widgetIds();
  const byId = new Map(data.lessons.map((l) => [l.lessonId, l]));
  let applied = 0;

  for (const f of inputs) {
    const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
    if (!fs.existsSync(p)) { errs.push(`input not found: ${f}`); continue; }
    const patches = JSON.parse(fs.readFileSync(p, "utf8")).patches ?? [];
    if (!patches.length) { errs.push(`${f}: no patches`); continue; }

    for (const patch of patches) {
      const where = `${patch.lessonId}/${patch.slug}`;
      const lesson = byId.get(patch.lessonId);
      if (!lesson) { errs.push(`${where}: no such lesson`); continue; }
      const concept = lesson.concepts.find((c) => c.slug === patch.slug);
      if (!concept) { errs.push(`${where}: no such concept in that lesson`); continue; }
      // Only fields the validator knows how to check may be patched; anything
      // else would land unvalidated, which is the failure mode this tool exists
      // to prevent.
      const field = patch.field ?? "code";
      if (!PATCHABLE.has(field)) { errs.push(`${where}: field "${field}" is not patchable`); continue; }
      const value = patch[field];
      if (!value) { errs.push(`${where}: patch has no ${field} block`); continue; }
      if (concept[field] && !force) {
        errs.push(`${where}: already has ${field} (pass --force to replace)`);
        continue;
      }
      // Validate the concept AS IT WOULD BE, not the patch in isolation: the
      // annotation line numbers are only checkable against the merged snippet,
      // and `architecture` is only checkable against its sibling `diagram`.
      const merged = { ...concept, [field]: value };
      const before = errs.length;
      checkConcept(merged, where, ids);
      if (errs.length > before) continue;   // rejected — leave the concept alone
      concept[field] = value;
      applied++;
      const detail = field === "code"
        ? `${value.lang}, ${value.snippet.split("\n").length} lines`
        : value.kind;
      console.log(`  + ${field} on ${where} (${detail})`);
    }
  }

  if (warns.length) { console.log(`\n${warns.length} warning(s):`); for (const w of warns.slice(0, 20)) console.log("  ! " + w); }
  if (errs.length) {
    console.error(`\n${errs.length} error(s):`);
    for (const e of errs.slice(0, 40)) console.error("  ✗ " + e);
    console.error("\n✗ refusing to write lessons.json.");
    process.exit(1);
  }
  if (dry) { console.log(`\n✓ dry run: ${applied} patch(es) would apply.`); return; }
  fs.writeFileSync(LESSONS, JSON.stringify(data), "utf8");
  console.log(`\n✓ wrote lessons.json: ${applied} field(s) patched`);
}

main();
