// Deterministically merges the enrichment fleet's output into lessons.json.
// Additive: only sets the enriched optional fields on matching concepts by slug;
// never removes/rewrites the base explanation/keyPoints/diagram. Validates every
// visual.widgetId against the real registry so a bad reference can't land.
//
// Usage: node research/merge-enriched.js research/enriched-output.json
const fs = require("fs");
const path = require("path");

const REGISTRY = ["big-o","sort-race","consistency","rag-pipeline","consensus","latency-budget","token-economics","threat-board","scaling-curves","eval-harness"];
const ENRICH_FIELDS = ["depth","keywords","code","example","architecture","diagram","visual","pitfalls","analogy","source"];

const inPath = process.argv[2] || "research/enriched-output.json";
const raw = JSON.parse(fs.readFileSync(inPath, "utf8"));
// Accept either {enriched:[...]} (full workflow return) or a bare [...] of lessons.
const enrichedLessons = Array.isArray(raw) ? raw : (raw.enriched || []);
if (!enrichedLessons.length) { console.error("no enriched lessons in", inPath); process.exit(1); }

const lessonsPath = path.join("src", "content", "data", "lessons.json");
const data = JSON.parse(fs.readFileSync(lessonsPath, "utf8"));
const byId = new Map(data.lessons.map((l) => [l.lessonId, l]));

let concepts = 0, fields = 0, droppedWidgets = 0, missing = 0;
for (const el of enrichedLessons) {
  const lesson = byId.get(el.lessonId);
  if (!lesson) { console.warn("no such lesson:", el.lessonId); continue; }
  const conceptById = new Map(lesson.concepts.map((c) => [c.slug, c]));
  for (const ec of el.concepts || []) {
    const target = conceptById.get(ec.slug);
    if (!target) { missing++; console.warn("  no such concept:", el.lessonId, ec.slug); continue; }
    let touched = false;
    for (const f of ENRICH_FIELDS) {
      if (ec[f] == null) continue;
      if (f === "visual") {
        if (!ec.visual.widgetId || !REGISTRY.includes(ec.visual.widgetId)) { droppedWidgets++; continue; }
        target.visual = { widgetId: ec.visual.widgetId, ...(ec.visual.params ? { params: ec.visual.params } : {}) };
      } else {
        target[f] = ec[f];
      }
      fields++; touched = true;
    }
    if (touched) concepts++;
  }
}

fs.writeFileSync(lessonsPath, JSON.stringify(data));
console.log(`merged: ${concepts} concepts, ${fields} fields · dropped ${droppedWidgets} invalid widget(s), ${missing} missing concept(s)`);
console.log(`lessons.json now ${(fs.statSync(lessonsPath).size/1024/1024).toFixed(2)} MB`);
