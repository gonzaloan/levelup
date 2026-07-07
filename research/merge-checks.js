// Deterministically merges authored check items into checks.json, VALIDATING
// every item so a malformed check can't reach the app: known kind, in-range
// indices (answers/pairs/bucket), matching array lengths, and a real concept slug.
// Usage: node research/merge-checks.js research/checks-in/*.json
const fs = require("fs");
const path = require("path");
const glob = process.argv.slice(2);

const lessons = JSON.parse(fs.readFileSync("src/content/data/lessons.json", "utf8"));
const validSlugs = new Set(lessons.lessons.flatMap((l) => l.concepts.map((c) => c.slug)));
const KINDS = new Set(["cloze", "order", "match", "categorize"]);

function isI18n(x) { return x && typeof x.en === "string" && typeof x.es === "string"; }
function inRange(n, max) { return Number.isInteger(n) && n >= 0 && n < max; }

function validate(it, where) {
  const err = (msg) => { console.warn(`  DROP ${where} ${it && it.id}: ${msg}`); return false; };
  if (!it || !KINDS.has(it.kind)) return err("bad kind");
  if (!it.id || !it.concept) return err("missing id/concept");
  if (!validSlugs.has(it.concept)) return err(`unknown concept ${it.concept}`);
  if (!isI18n(it.prompt) || !isI18n(it.explain)) return err("prompt/explain not i18n");
  if (it.track !== "general" && it.track !== "ai") return err("bad track");
  if (it.kind === "cloze") {
    if (!Array.isArray(it.segments) || !it.segments.every(isI18n)) return err("segments");
    if (!Array.isArray(it.bank) || !it.bank.every(isI18n)) return err("bank");
    if (!Array.isArray(it.answers) || !it.answers.every((a) => inRange(a, it.bank.length))) return err("answers out of range");
    if (it.segments.length !== it.answers.length + 1) return err("segments must be answers+1");
  } else if (it.kind === "order") {
    if (!Array.isArray(it.items) || it.items.length < 2 || !it.items.every(isI18n)) return err("items");
  } else if (it.kind === "match") {
    if (!Array.isArray(it.left) || !it.left.every(isI18n)) return err("left");
    if (!Array.isArray(it.right) || !it.right.every(isI18n)) return err("right");
    if (!Array.isArray(it.pairs) || !it.pairs.every(([l, r]) => inRange(l, it.left.length) && inRange(r, it.right.length))) return err("pairs out of range");
    if (it.pairs.length !== it.left.length) return err("every left must pair");
  } else if (it.kind === "categorize") {
    if (!Array.isArray(it.buckets) || it.buckets.length < 2 || !it.buckets.every(isI18n)) return err("buckets");
    if (!Array.isArray(it.items) || !it.items.every((x) => isI18n(x.label) && inRange(x.bucket, it.buckets.length))) return err("items/bucket");
  }
  return true;
}

const existing = JSON.parse(fs.readFileSync("src/content/data/checks.json", "utf8")).checks || [];
const byId = new Map(existing.map((c) => [c.id, c]));
let added = 0, dropped = 0;

for (const file of glob) {
  let data; try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.warn(`  bad JSON ${file}: ${e.message}`); continue; }
  const items = Array.isArray(data) ? data : (data.checks || data.items || []);
  for (const it of items) {
    if (validate(it, path.basename(file))) { byId.set(it.id, it); added++; }
    else dropped++;
  }
}

const merged = [...byId.values()];
fs.writeFileSync("src/content/data/checks.json", JSON.stringify({ checks: merged }));
const byKind = merged.reduce((m, c) => ((m[c.kind] = (m[c.kind] || 0) + 1), m), {});
const byConcept = new Set(merged.map((c) => c.concept));
console.log(`merged: +${added} valid, ${dropped} dropped · total ${merged.length} checks across ${byConcept.size} concepts`);
console.log(`by kind: ${JSON.stringify(byKind)}`);
