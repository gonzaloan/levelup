// Apply content-repair patches to lessons.json. Each patch targets a concept by
// (lessonId, slug) and replaces only the listed fields. visualWidgetId:"" removes
// the concept's visual; a non-empty value sets it. Validates slugs exist.
// Usage: node research/apply-patches.js research/repairs.json
const fs = require("fs");
const raw = JSON.parse(fs.readFileSync(process.argv[2] || "research/repairs.json", "utf8"));
const repairs = Array.isArray(raw) ? raw : (raw.repairs || []);

const path = "src/content/data/lessons.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));
const byId = new Map(data.lessons.map((l) => [l.lessonId, l]));

const FIELDS = ["explanation", "depth", "keyPoints", "architecture", "diagram", "example", "code", "analogy", "pitfalls", "keywords"];
let concepts = 0, fields = 0, widgetsSet = 0, widgetsRemoved = 0, missing = 0;

for (const rep of repairs) {
  const lesson = byId.get(rep.lessonId);
  if (!lesson) { console.warn("no lesson", rep.lessonId); continue; }
  // top-level overview fix (gap on the "overview" pseudo-slug)
  if (rep.overview && rep.overview.en && rep.overview.es) { lesson.overview = rep.overview; fields++; }
  const bySlug = new Map(lesson.concepts.map((c) => [c.slug, c]));
  for (const patch of rep.patches || []) {
    // NOTE: patch.overviewFix is a human-readable changelog note, NOT overview
    // text — never write it into lesson.overview (that destroyed content once).
    // The real corrected overview only ever comes from rep.overview (handled above).
    if (patch.slug === "overview") { continue; }
    const c = bySlug.get(patch.slug);
    if (!c) { missing++; console.warn("  no concept", rep.lessonId, patch.slug); continue; }
    let touched = false;
    for (const f of FIELDS) {
      if (patch[f] != null) { c[f] = patch[f]; fields++; touched = true; }
    }
    if (typeof patch.visualWidgetId === "string") {
      if (patch.visualWidgetId === "") { if (c.visual) { delete c.visual; widgetsRemoved++; touched = true; } }
      else { c.visual = { widgetId: patch.visualWidgetId }; widgetsSet++; touched = true; }
    }
    if (touched) concepts++;
  }
}

fs.writeFileSync(path, JSON.stringify(data));
console.log(`patched ${concepts} concepts, ${fields} fields · widgets set ${widgetsSet}, removed ${widgetsRemoved}, missing ${missing}`);
console.log(`lessons.json now ${(fs.statSync(path).size / 1024 / 1024).toFixed(2)} MB`);
