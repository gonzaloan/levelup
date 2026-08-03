#!/usr/bin/env node
/**
 * tools/check-axes.cjs — do an `axes` diagram's nodes agree with its axis labels?
 *
 * WHY THIS EXISTS
 * `merge-lessons.cjs` now checks that an `axes` schematic HAS nodes (it shipped 7
 * with none, rendering two empty lines under a caption). It cannot check whether a
 * node's POSITION agrees with the axis text beside it, and three diagrams shipped
 * where every point contradicted its own label:
 *
 *   driving-irreversible-bets-with-consensus  x: "(hard to undo … easy to undo)"
 *                                             nodes: easy → hard
 *   borrowed-authority-alignment              y: "(central → edge/non-negotiable)"
 *                                             nodes: edge → central
 *   toil-reduction-program                    y: "operational load"
 *                                             nodes: a timeline whose load FALLS,
 *                                             drawn rising
 *
 * The renderer places node i at x = 70 + frac*200 and y = 160 - frac*130
 * (Schematic.tsx), so node 1 is at the ORIGIN of both axes and the last is
 * top-right. An axis label that names its low end and its high end therefore makes
 * a checkable claim about node 1 and node n.
 *
 * WHAT THIS CAN AND CANNOT DO
 * It cannot read meaning. It checks a MECHANICAL agreement: when an axis label
 * names two poles (via an arrow or a parenthetical), the first node's text should
 * lean toward the low pole and the last node's toward the high pole. That catches a
 * full inversion, which is the defect that shipped. It cannot catch a subtly wrong
 * middle ordering — that stays a review question, and the tool says so rather than
 * implying coverage it does not have.
 *
 *   node tools/check-axes.cjs            # fail on a detected inversion
 *   node tools/check-axes.cjs --report   # print every axes diagram's poles
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const lessons = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/data/lessons.json"), "utf8")).lessons;

/**
 * Split an axis label into (low pole, high pole), or null if it names no direction.
 * Three encodings appear in the corpus: an inline arrow, a parenthetical with an
 * arrow or dot-leader, and no direction at all.
 */
function poles(label) {
  if (!label) return null;
  const paren = /\(([^)]*)\)/.exec(label);
  const body = paren ? paren[1] : label;
  const parts = body.split(/\s*(?:→|->|\.{3,}|…)\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return { low: parts[0], high: parts[parts.length - 1] };
}

/** Content words of a string, for overlap scoring. */
const STOP = new Set(["the", "a", "an", "of", "to", "in", "on", "at", "and", "or", "is", "it",
  "this", "that", "with", "for", "how", "what", "your", "you", "per", "not", "no", "one", "more", "less"]);
const words = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ")
  .split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

/** How strongly does `text` lean toward `pole`, as a shared-word count. */
function lean(text, pole) {
  const t = new Set(words(text));
  return words(pole).filter((w) => t.has(w)).length;
}

const findings = [];
const report = [];

for (const lesson of lessons) {
  for (const c of lesson.concepts) {
    for (const field of ["diagram", "architecture"]) {
      const s = c[field];
      if (!s || s.kind !== "axes") continue;
      const nodes = s.nodes || [];
      if (nodes.length < 2) continue; // merge-lessons already fails this

      const first = nodes[0].label?.en ?? "";
      const last = nodes[nodes.length - 1].label?.en ?? "";

      for (const axis of ["xAxis", "yAxis"]) {
        const p = poles(s[axis]?.en);
        if (!p) { report.push(`${c.slug}.${field}.${axis}: no direction named — not checkable`); continue; }

        // Node 1 sits at the LOW pole, node n at the HIGH pole.
        const firstLow = lean(first, p.low), firstHigh = lean(first, p.high);
        const lastLow = lean(last, p.low), lastHigh = lean(last, p.high);
        report.push(`${c.slug}.${field}.${axis}: "${p.low}" → "${p.high}"  first(${firstLow}/${firstHigh}) last(${lastLow}/${lastHigh})`);

        // A full inversion: the FIRST node matches the HIGH pole more than the low,
        // AND the LAST node matches the LOW pole more than the high. Requiring both
        // ends to disagree keeps this from firing on a merely weak word overlap.
        const inverted = firstHigh > firstLow && lastLow > lastHigh;
        if (inverted) {
          findings.push({
            slug: c.slug, lesson: lesson.lessonId, field, axis,
            label: s[axis].en,
            first, last,
            detail: `node 1 leans "${p.high}" (the HIGH pole) and node ${nodes.length} leans "${p.low}" (the LOW pole) — the axis label runs opposite to the nodes`,
          });
        }
      }
    }
  }
}

if (process.argv.includes("--report")) {
  console.log(`\n${report.length} axis label(s) across the corpus:\n`);
  for (const r of report) console.log(`  ${r}`);
}

const axesCount = lessons.flatMap((l) => l.concepts)
  .flatMap((c) => [c.diagram, c.architecture])
  .filter((s) => s && s.kind === "axes").length;

console.log(`\nchecked ${axesCount} axes schematic(s); ${report.filter((r) => r.includes("not checkable")).length} axis label(s) name no direction`);

if (findings.length) {
  console.log(`\n✗ ${findings.length} axis label runs opposite to its own nodes:\n`);
  for (const f of findings) {
    console.log(`  ${f.lesson}/${f.slug}.${f.field}.${f.axis}`);
    console.log(`    label: ${f.label}`);
    console.log(`    node 1: ${f.first.slice(0, 76)}`);
    console.log(`    node n: ${f.last.slice(0, 76)}`);
    console.log(`    ${f.detail}`);
  }
  console.log("\nThe renderer plots node 1 at the origin of both axes and the last at");
  console.log("top-right, so either reverse the label or reverse the nodes.");
  process.exit(1);
}
console.log("✓ no axes diagram contradicts its own axis labels");
console.log("  (mechanical check: catches a full inversion, not a subtly wrong middle)");
