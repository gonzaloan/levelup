#!/usr/bin/env node
// Deterministically merge fleet-proposed widget mappings into lessons.json.
// Validates each proposal before applying:
//   • widgetId is a registered widget
//   • slug is a real concept that appears in lessons.json
//   • the concept does NOT already have a visual (never clobber authored ones)
//   • params shape matches the widget's minimal contract
//   • bilingual {en,es} strings are non-empty where required
// Reads proposals JSON (array of {slug,widgetId,params}) from the path in argv[2].
// Writes lessons.json in place. Prints a report; exits non-zero if 0 applied.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const LESSONS = path.join(ROOT, "src/content/data/lessons.json");
const REGISTERED = new Set([
  "big-o", "sort-race", "consistency", "rag-pipeline", "consensus",
  "latency-budget", "token-economics", "threat-board", "scaling-curves", "eval-harness",
  "spectrum", "decision-flow", "tradeoff-curve",
]);
// Signature widgets take NO params; the 3 generic ones REQUIRE a params shape.
const PARAM_REQUIRED = new Set(["spectrum", "decision-flow", "tradeoff-curve"]);

function i18nOk(x) { return x && typeof x.en === "string" && x.en.length > 0 && typeof x.es === "string" && x.es.length > 0; }

function validParams(widgetId, p) {
  if (!PARAM_REQUIRED.has(widgetId)) return true; // signature widgets ignore params
  if (!p || typeof p !== "object") return false;
  if (widgetId === "spectrum") {
    if (!i18nOk(p.leftPole) || !i18nOk(p.rightPole)) return false;
    if (!Array.isArray(p.dimensions) || p.dimensions.length < 2) return false;
    return p.dimensions.every((d) => i18nOk(d.label) && i18nOk(d.left) && i18nOk(d.right));
  }
  if (widgetId === "tradeoff-curve") {
    if (!i18nOk(p.xAxis) || !i18nOk(p.yAxis)) return false;
    if (!["u", "diminishing", "linear-up"].includes(p.shape)) return false;
    return i18nOk(p.lowNote) && i18nOk(p.highNote);
  }
  if (widgetId === "decision-flow") {
    if (typeof p.start !== "string" || !p.nodes || typeof p.nodes !== "object") return false;
    const ids = Object.keys(p.nodes);
    if (!ids.includes(p.start)) return false;
    for (const id of ids) {
      const n = p.nodes[id];
      const isVerdict = i18nOk(n.verdict);
      const isQuestion = i18nOk(n.q) && typeof n.yes === "string" && typeof n.no === "string";
      if (!isVerdict && !isQuestion) return false;
      if (isQuestion) {
        if (!ids.includes(n.yes) || !ids.includes(n.no)) return false; // edges must resolve
      }
    }
    // at least one verdict reachable
    return ids.some((id) => i18nOk(p.nodes[id].verdict));
  }
  return false;
}

function main() {
  const proposalsPath = process.argv[2];
  if (!proposalsPath) { console.error("usage: merge-widgets.cjs <proposals.json>"); process.exit(2); }
  const proposals = JSON.parse(fs.readFileSync(proposalsPath, "utf8"));
  const list = Array.isArray(proposals) ? proposals : proposals.mappings || [];

  const data = JSON.parse(fs.readFileSync(LESSONS, "utf8"));
  const lessons = Array.isArray(data) ? data : data.lessons || Object.values(data);

  // index concept slug -> concept object
  const bySlug = new Map();
  for (const les of lessons) for (const c of les.concepts || []) bySlug.set(c.slug, c);

  let applied = 0, skipped = [];
  const seen = new Set();
  for (const m of list) {
    const reason = (r) => skipped.push(`${m.slug} [${m.widgetId}]: ${r}`);
    if (!m || !m.slug || !m.widgetId) { reason("missing slug/widgetId"); continue; }
    if (seen.has(m.slug)) { reason("duplicate slug in proposals"); continue; }
    if (!REGISTERED.has(m.widgetId)) { reason("unregistered widget"); continue; }
    const c = bySlug.get(m.slug);
    if (!c) { reason("slug not found in lessons"); continue; }
    if (c.visual && c.visual.widgetId) { reason("already has a visual"); continue; }
    if (!validParams(m.widgetId, m.params)) { reason("invalid params shape"); continue; }
    c.visual = PARAM_REQUIRED.has(m.widgetId) ? { widgetId: m.widgetId, params: m.params } : { widgetId: m.widgetId };
    seen.add(m.slug);
    applied++;
  }

  fs.writeFileSync(LESSONS, JSON.stringify(data));
  console.log(`Applied ${applied} widget mappings. Skipped ${skipped.length}.`);
  if (skipped.length) console.log(skipped.map((s) => "  - " + s).join("\n"));
  if (applied === 0) process.exit(1);
}
main();
