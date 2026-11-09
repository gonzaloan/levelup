#!/usr/bin/env node
// Validate exercise files. Usage: node tools/check-exercises.mjs [files...]  (no files = all)
import fs from "node:fs";
import path from "node:path";
import { loadDomains, listExerciseFiles, validateExercises, ROOT } from "./content-lib.mjs";

const args = process.argv.slice(2);
let files = args.filter((a) => !a.startsWith("--")).map((f) => path.resolve(f));
if (!files.length) files = listExerciseFiles();
const domains = loadDomains();
let bad = 0;
for (const f of files) {
  let x;
  try { x = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.log(`✗ ${path.relative(ROOT, f)}\n   invalid JSON: ${e.message}`); bad++; continue; }
  const { errors, warnings } = validateExercises(x, f, domains);
  if (errors.length) { bad++; console.log(`✗ ${path.relative(ROOT, f)}`); errors.forEach((e) => console.log("   - " + e)); }
  else console.log(`✓ ${path.relative(ROOT, f)} (${x.items.length} items)${warnings.length ? "  warn: " + warnings.join("; ") : ""}`);
}
console.log(bad ? `\n${bad} file(s) with errors` : `\nall ${files.length} valid`);
process.exit(bad ? 1 : 0);
