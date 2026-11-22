// Coding problems gate: schema, then every reference solution must pass all its tests and every
// starter must fail at least one, using the exact harness the browser runs (public/py/runner.mjs)
// on Pyodide in Node. Usage: node tools/check-problems.mjs [files...]
import fs from "node:fs";
import path from "node:path";
import { ROOT, listProblemFiles, loadDomains, validateProblem } from "./content-lib.mjs";
import { runTests } from "../public/py/runner.mjs";

const files = process.argv.slice(2).length ? process.argv.slice(2).map((f) => path.resolve(f)) : listProblemFiles();
const ids = new Set(loadDomains().flatMap((d) => d.concepts));
const { loadPyodide } = await import(path.join(ROOT, "node_modules", "pyodide", "pyodide.mjs"));
const py = await loadPyodide({ indexURL: path.join(ROOT, "node_modules", "pyodide") + "/" });

let bad = 0;
const seen = new Set();
for (const f of files) {
  const rel = path.relative(ROOT, f);
  let p;
  try { p = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.log(`✗ ${rel}: invalid JSON (${e.message})`); bad++; continue; }
  const errors = validateProblem(p, ids);
  if (path.basename(f, ".json") !== p.id) errors.push(`file name must be ${p.id}.json`);
  if (seen.has(p.id)) errors.push("duplicate id");
  seen.add(p.id);
  if (!errors.length) {
    const run = async (code) => runTests(py, { code, fn: p.fn, tests: p.tests, compare: p.compare ?? "exact" });
    const sol = await run(p.solution);
    if (sol.error) errors.push(`solution: ${sol.error}`);
    else sol.results.forEach((r, i) => { if (!r.ok) errors.push(`solution fails tests[${i}]: got ${JSON.stringify(r.got)}${r.error ? ` (${r.error})` : ""}, expected ${JSON.stringify(p.tests[i].expected)}`); });
    const start = await run(p.starter);
    if (!start.error && start.results.every((r) => r.ok)) errors.push("starter passes every test: the tests check nothing");
  }
  if (errors.length) { bad++; console.log(`✗ ${rel}\n   ${errors.join("\n   ")}`); }
  else console.log(`✓ ${rel} (${p.tests.length} tests)`);
}
console.log(bad ? `\n${bad} of ${files.length} problems failed` : `\nall ${files.length} problems valid`);
process.exit(bad ? 1 : 0);
