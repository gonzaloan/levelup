#!/usr/bin/env node
// Add or replace a problem's `perf` block without reformatting the rest of the file (the problem
// files keep one test per line). Usage: node tools/set-perf.mjs <problem-id> <perf.json>
// Then: node tools/check-problems.mjs --write-sha content/problems/<id>.json
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./content-lib.mjs";

const [id, src] = process.argv.slice(2);
if (!id || !src) { console.log("usage: node tools/set-perf.mjs <problem-id> <perf.json>"); process.exit(1); }
const file = path.join(ROOT, "content", "problems", `${id}.json`);
const perf = JSON.parse(fs.readFileSync(src, "utf8"));
const order = ["size", "limitMs", "sha", "gen", "naive"];
const block = `  "perf": {\n${order.filter((k) => k in perf).map((k) => `    ${JSON.stringify(k)}: ${k === "size" ? `{ "en": ${JSON.stringify(perf.size.en)}, "es": ${JSON.stringify(perf.size.es)} }` : JSON.stringify(perf[k])}`).join(",\n")}\n  }`;
let text = fs.readFileSync(file, "utf8").replace(/,\n {2}"perf": \{[\s\S]*?\n {2}\}(?=\n\}\s*$)/, "");
text = text.replace(/\n\}\s*$/, `,\n${block}\n}\n`);
JSON.parse(text); // still valid JSON
fs.writeFileSync(file, text);
console.log(`perf set on ${id}`);
