// Coding problems gate: schema, then every reference solution must pass all its tests and every
// starter must fail at least one, using the exact harness the browser runs (public/py/runner.mjs)
// on Pyodide in Node. A problem with `perf` (one large, timed input) must also show the time limit
// means something: the reference passes it with ≥ 20× headroom (slow phones, other correct styles)
// and `perf.naive`, correct on every test, takes ≥ 2× the limit. Limits are scaled to this machine's
// speed by the harness's benchmark (as in the browser), so the verdict doesn't depend on the machine.
// Usage: node tools/check-problems.mjs [--strict] [--write-sha] [files...]  (author with --strict)
import fs from "node:fs";
import path from "node:path";
import { ROOT, listProblemFiles, loadDomains, validateProblem } from "./content-lib.mjs";
import { runPerf, runTests } from "../public/py/runner.mjs";

const writeSha = process.argv.includes("--write-sha");
const argFiles = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const files = argFiles.length ? argFiles.map((f) => path.resolve(f)) : listProblemFiles();
// Authoring (--strict) proves the limit is well placed: the reference needs 20× headroom under it
// and the naive takes ≥ 2× it. The everyday gate only catches real breakage (a slow reference, a
// naive that got fast) with wide tolerances, so timing noise on a busy machine can't turn it red.
const STRICT = process.argv.includes("--strict") || writeSha;
const HEADROOM = STRICT ? 20 : 8, NAIVE_OVER = STRICT ? 2 : 1.25;
const ids = new Set(loadDomains().flatMap((d) => d.concepts));
const { loadPyodide } = await import(path.join(ROOT, "node_modules", "pyodide", "pyodide.mjs"));
const py = await loadPyodide({ indexURL: path.join(ROOT, "node_modules", "pyodide") + "/" });

let bad = 0;
const seen = new Set();
for (const f of files) {
  const rel = path.relative(ROOT, f);
  let p;
  try { p = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.log(`✗ ${rel}: invalid JSON (${e.message})`); bad++; continue; }
  // --write-sha fills a missing digest from the reference solution, then validates as usual.
  if (writeSha && p.perf && !/^[0-9a-f]{16}$/.test(p.perf.sha ?? "")) {
    const r = await runPerf(py, { code: p.solution, fn: p.fn, compare: p.compare ?? "exact", perf: { ...p.perf, sha: "", limitMs: 1e9 } });
    // A text replace, not a re-serialize: the files keep their one-test-per-line layout.
    if (r.digest) { p.perf.sha = r.digest; fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/"sha": "[0-9a-f]*"/, `"sha": "${r.digest}"`)); }
  }
  let perfNote = "";
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
    if (p.perf && !errors.length) {
      const perf = (code) => runPerf(py, { code, fn: p.fn, compare: p.compare ?? "exact", perf: p.perf });
      // Best of three: a busy machine adds noise, never speed, so the minimum is the honest time.
      let ref = await perf(p.solution);
      for (let k = 0; k < 2 && ref.right; k++) { const again = await perf(p.solution); if (again.ms < ref.ms) ref = again; }
      if (ref.error) errors.push(`perf: reference fails on the large input: ${ref.error}`);
      else if (!ref.right) errors.push(`perf: reference digest ${ref.digest} ≠ perf.sha ${p.perf.sha} (rerun with --write-sha after changing gen)`);
      else if (ref.ms * HEADROOM > ref.limit) errors.push(`perf: reference takes ${ref.ms} ms; the limit (${p.perf.limitMs} ms, ${ref.limit} ms on this machine) needs ${HEADROOM}× headroom: raise limitMs or shrink gen`);
      const nt = await run(p.perf.naive);
      if (nt.error || !nt.results.every((r) => r.ok)) errors.push("perf.naive must pass every test (it is correct, only slow)");
      else {
        const nv = await perf(p.perf.naive);
        if (nv.ms < NAIVE_OVER * nv.limit) errors.push(`perf: the naive solution takes only ${nv.ms} ms, under ${NAIVE_OVER}× the limit (${p.perf.limitMs} ms, ${nv.limit} ms on this machine): grow gen or lower limitMs`);
        else if (!errors.length) perfNote = ` · perf ${ref.ms} ms vs naive ${nv.ms} ms, limit ${p.perf.limitMs} ms (×${ref.scale} here)`;
      }
    }
  }
  if (errors.length) { bad++; console.log(`✗ ${rel}\n   ${errors.join("\n   ")}`); }
  else console.log(`✓ ${rel} (${p.tests.length} tests${perfNote})`);
}
console.log(bad ? `\n${bad} of ${files.length} problems failed` : `\nall ${files.length} problems valid`);
process.exit(bad ? 1 : 0);
