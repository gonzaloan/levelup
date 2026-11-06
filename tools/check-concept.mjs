#!/usr/bin/env node
// Validate concept files. Usage: node tools/check-concept.mjs [--mermaid] [files...]  (no files = all)
import fs from "node:fs";
import path from "node:path";
import { loadDomains, listConceptFiles, validateConcept, launchBrowser, ROOT } from "./content-lib.mjs";

const args = process.argv.slice(2);
const doMermaid = args.includes("--mermaid");
let files = args.filter((a) => !a.startsWith("--")).map((f) => path.resolve(f));
if (!files.length) files = listConceptFiles();
const domains = loadDomains();
let bad = 0;
const diagrams = [];
for (const f of files) {
  let c;
  try { c = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.log(`✗ ${path.relative(ROOT, f)}\n   invalid JSON: ${e.message}`); bad++; continue; }
  const { errors, warnings } = validateConcept(c, f, domains);
  if (c?.diagram?.code) diagrams.push({ f, code: c.diagram.code });
  if (errors.length) { bad++; console.log(`✗ ${path.relative(ROOT, f)}`); errors.forEach((e) => console.log("   - " + e)); }
  else console.log(`✓ ${path.relative(ROOT, f)}${warnings.length ? "  (" + warnings.join("; ") + ")" : ""}`);
}
if (doMermaid && diagrams.length) {
  const b = await launchBrowser(); const p = await b.newPage();
  await p.setContent("<html><body></body></html>");
  await p.addScriptTag({ path: path.join(ROOT, "node_modules/mermaid/dist/mermaid.min.js") });
  for (const d of diagrams) {
    const err = await p.evaluate(async (code) => { try { mermaid.initialize({ startOnLoad: false }); await mermaid.render("x" + Math.floor(performance.now()), code); return null; } catch (e) { return String(e.message || e); } }, d.code);
    if (err) { bad++; console.log(`✗ ${path.relative(ROOT, d.f)} mermaid: ${err.split("\n").slice(0, 4).join(" | ")}`); }
  }
  await b.close();
}
console.log(bad ? `\n${bad} file(s) with errors` : `\nall ${files.length} valid`);
process.exit(bad ? 1 : 0);
