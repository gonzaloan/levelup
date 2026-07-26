#!/usr/bin/env node
/**
 * Assemble one lesson from per-batch partial files.
 *
 * Why partials: a single agent authoring 5-6 deep bilingual concepts reliably
 * exceeds one response and dies mid-JSON ("connection closed"), losing the whole
 * lesson. So each agent writes 2-3 concepts to its own small file and this script
 * stitches them, ordering concepts to match the curriculum spine exactly.
 *
 * The lesson-level wrapper (overview / midQuiz / cheatSheet) comes from a
 * separate `--wrap` file so the batches stay purely concept-shaped.
 *
 * Usage:
 *   node tools/assemble-lesson.cjs --id cloud-platform-l3 \
 *        --wrap research/cl-wrap-l3.json \
 *        research/cl-out-l3-1.json research/cl-out-l3-2.json \
 *        --out research/cloud-lesson-l3.json
 *
 * Output is a lessons.json-shaped file, ready for tools/merge-lessons.cjs, which
 * is what actually validates it. This script only assembles and orders.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SPINE = path.join(ROOT, "src/content/data/curriculum.json");

function arg(name, required = true) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || !process.argv[i + 1]) {
    if (required) { console.error(`missing --${name}`); process.exit(1); }
    return null;
  }
  return process.argv[i + 1];
}

const id = arg("id");
const out = arg("out");
const wrapPath = arg("wrap", false);
const flagValues = new Set([id, out, wrapPath].filter(Boolean));
const parts = process.argv.slice(2).filter((a) => !a.startsWith("--") && !flagValues.has(a));

if (!parts.length) { console.error("no partial files given"); process.exit(1); }

const spine = JSON.parse(fs.readFileSync(SPINE, "utf8"));
const domainId = id.slice(0, -3);
const level = id.slice(-2).toUpperCase();
const band = spine.domains.find((d) => d.id === domainId)?.levels.find((l) => l.level === level);
if (!band) { console.error(`no spine band for ${id}`); process.exit(1); }
const want = band.concepts.map((c) => c.slug);

// Collect concepts from every partial, last-writer-wins on a slug collision so a
// re-run of one batch can fix just that batch.
const bySlug = new Map();
for (const f of parts) {
  const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.error(`✗ missing partial: ${f}`); process.exit(1); }
  let data;
  try { data = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { console.error(`✗ ${f}: invalid JSON (${e.message}) — the agent was probably truncated; re-run that batch`); process.exit(1); }
  const list = data.concepts ?? [];
  if (!list.length) { console.error(`✗ ${f}: no concepts`); process.exit(1); }
  for (const c of list) {
    if (!c.slug) { console.error(`✗ ${f}: a concept has no slug`); process.exit(1); }
    if (!want.includes(c.slug)) { console.error(`✗ ${f}: slug "${c.slug}" is not in the ${id} band`); process.exit(1); }
    bySlug.set(c.slug, c);
  }
  console.log(`  + ${path.basename(f)}: ${list.map((c) => c.slug).join(", ")}`);
}

const missing = want.filter((s) => !bySlug.has(s));
if (missing.length) {
  console.error(`✗ ${id} incomplete — missing: ${missing.join(", ")}`);
  process.exit(1);
}

// Spine order is the learning order; never trust the file order.
const concepts = want.map((s) => bySlug.get(s));

const wrap = wrapPath ? JSON.parse(fs.readFileSync(path.join(ROOT, wrapPath), "utf8")) : {};
const lesson = {
  lessonId: id,
  overview: wrap.overview,
  concepts,
  midQuiz: wrap.midQuiz ?? [],
};
if (wrap.cheatSheet) lesson.cheatSheet = wrap.cheatSheet;

fs.writeFileSync(path.join(ROOT, out), JSON.stringify({ lessons: [lesson] }, null, 1) + "\n", "utf8");
console.log(`✓ assembled ${id}: ${concepts.length} concepts, ${lesson.midQuiz.length} quiz items → ${out}`);
console.log(`  next: node tools/merge-lessons.cjs ${out}`);
