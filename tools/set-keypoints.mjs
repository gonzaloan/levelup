// Write a concept's `keyPoints` without reformatting the rest of its file.
// Usage: node tools/set-keypoints.mjs <concept-id> <points.json>
//   points.json = [{ "en": "...", "es": "..." }, ...]  (3-5 items)
// Inserts the field right after `explain` (or replaces an existing one), then validates the file.
import fs from "node:fs";
import path from "node:path";
import { CONTENT, loadDomains, validateConcept } from "./content-lib.mjs";

const [id, pointsFile] = process.argv.slice(2);
if (!id || !pointsFile) { console.error("usage: node tools/set-keypoints.mjs <concept-id> <points.json>"); process.exit(2); }

const domains = loadDomains();
const raw0 = JSON.parse(fs.readFileSync(path.join(CONTENT, "domains.json"), "utf8"));
const domain = raw0.find((d) => d.concepts.includes(id));
if (!domain) { console.error(`✗ unknown concept id: ${id}`); process.exit(2); }
const file = path.join(CONTENT, "concepts", domain.id, `${id}.json`);

const points = JSON.parse(fs.readFileSync(pointsFile, "utf8"));
if (!Array.isArray(points) || !points.every((p) => p && typeof p.en === "string" && typeof p.es === "string")) {
  console.error("✗ points.json must be an array of { en, es } strings"); process.exit(2);
}
const block = `  "keyPoints": [\n${points.map((p) => `    {\n      "en": ${JSON.stringify(p.en.trim())},\n      "es": ${JSON.stringify(p.es.trim())}\n    }`).join(",\n")}\n  ],\n`;

let raw = fs.readFileSync(file, "utf8");
const existing = raw.match(/\n {2}"keyPoints": \[[\s\S]*?\n {2}\],\n/);
if (existing) raw = raw.replace(existing[0], "\n" + block);
else {
  const start = raw.indexOf('\n  "explain": {');
  const end = start < 0 ? -1 : raw.indexOf("\n  },\n", start);
  if (end < 0) { console.error(`✗ ${file}: could not find the "explain" block`); process.exit(1); }
  raw = raw.slice(0, end + 6) + block + raw.slice(end + 6); // after "\n  },\n"
}
const concept = JSON.parse(raw); // never write a file that does not parse
const { errors, warnings } = validateConcept(concept, file, domains);
if (errors.length) { console.error(`✗ ${id}:\n  ${errors.join("\n  ")}`); process.exit(1); }
fs.writeFileSync(file, raw);
console.log(`✓ ${id}: ${points.length} key points${warnings.length ? ` (warnings: ${warnings.join("; ")})` : ""}`);
