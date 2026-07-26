#!/usr/bin/env node
/* Apply research/resource-concept-map.json onto the shipped resources.json,
   then re-run the validating merge. Drops explicitly rejected weak mappings.
   Idempotent: the map is authoritative, so re-running yields the same file. */
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const TARGET = path.join(ROOT, "src/content/data/resources.json");
const MAP = path.join(ROOT, "research/resource-concept-map.json");

// Mappings the review rejected as keyword-adjacent rather than substantive.
// Kept explicit (not silently edited in the map file) so the decision is auditable.
const REJECT = [
  ["vllm-repo", "backpressure-flow-control"],        // scheduler admission control is inferred, not taught
  ["berkeley-llm-agents-course", "security-program-adversarial"], // syllabus unverified, too diffuse
  // The article is about control-plane launch throughput, not a damped control
  // loop — a learner sent there from the autoscaling concept would be confused.
  ["containers-blog-ecs-fargate-launch-rates", "autoscaling-is-a-control-loop"],
  // Health-check DESIGN feeds the loop but isn't about the loop's dynamics.
  ["abl-implementing-health-checks", "autoscaling-is-a-control-loop"],
];

const data = JSON.parse(fs.readFileSync(TARGET, "utf8"));
const map = JSON.parse(fs.readFileSync(MAP, "utf8")).map;
const rejected = new Set(REJECT.map(([r, c]) => `${r}::${c}`));

let applied = 0, dropped = 0;
for (const r of data.resources) {
  const slugs = (map[r.id] ?? []).filter((s) => {
    if (rejected.has(`${r.id}::${s}`)) { dropped++; return false; }
    return true;
  });
  r.concepts = [...new Set(slugs)].sort();
  if (r.concepts.length) applied++;
}
fs.writeFileSync(TARGET, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`applied concepts to ${applied} resources (${dropped} weak mappings rejected)`);
