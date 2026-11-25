#!/usr/bin/env node
// Facts that go stale: prices, model ids, spec versions and product status ("preview", "GA",
// "deprecated"). Lists every English sentence in the concepts that states one, and flags it when
// it carries no date (prices must: CLAUDE.md) or its newest date is older than --months.
// Advisory: it tells the owner what to re-verify, it never fails the build unless --strict
// (then undated prices fail). Usage: npm run stale [-- --months 12 --today 2026-11 --json]
import fs from "node:fs";
import { listConceptFiles } from "./content-lib.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const months = Number(arg("--months", "12"));
const now = arg("--today", new Date().toISOString().slice(0, 7));
const strict = process.argv.includes("--strict");

const VOLATILE = [
  ["price", /\$\s?\d[\d.,]*\s*(k|M)?\s*(\/|per)\s*(1?\s?M\b|million|MTok|1K|K\b|thousand|tokens?|hours?|hr|month|mo\b|GB|TB|requests?|seat|user)/i],
  ["model", /\b(claude[- ](\d|opus|sonnet|haiku|fable)[\w.-]*|gpt-?\d[\w.-]*|o[134](-mini)?\b|gemini[- ]\d[\w.-]*|llama[- ]?\d[\w.-]*|mistral[- ][\w.-]+|deepseek[- ][\w.-]+|qwen[\d.-]*\w*)/i],
  ["version", /\b(spec|version|protocol|revision)\s+(v?\d+(\.\d+)+|\d{4}-\d{2}-\d{2})/i],
  ["status", /\b(in preview|public preview|private preview|beta|generally available|\bGA\b|deprecated|sunset|retir(ed|ing)|end[- ]of[- ]life)\b/i],
];
const VENDOR = /\b(openai|anthropic|claude|gpt|gemini|google|aws|amazon|azure|bedrock|vertex|cohere|voyage|pinecone|mistral|deepseek|together|groq|fireworks|list price|pricing|text-embedding|nvidia|h100|a100|b200)\b/i;
const LABELLED = /\b(assum\w*|toy|illustrative|example values?|hypothetical)\b/i;
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** The newest year-month a sentence mentions ("2026-07", "Nov 2026", "2025"), as "YYYY-MM". */
function newestDate(s) {
  const found = [];
  for (const m of s.matchAll(/\b(20\d\d)-(0[1-9]|1[0-2])\b/g)) found.push(`${m[1]}-${m[2]}`);
  for (const m of s.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(20\d\d)\b/gi)) found.push(`${m[2]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, "0")}`);
  for (const m of s.matchAll(/\b(20\d\d)\b(?!-\d)/g)) found.push(`${m[1]}-12`); // a bare year: its last month, generously
  return found.sort().at(-1) ?? null;
}
const monthsBetween = (a, b) => { const [ya, ma] = a.split("-").map(Number), [yb, mb] = b.split("-").map(Number); return (yb - ya) * 12 + (mb - ma); };

/** Every English string in a concept, with the field it came from. */
function* englishText(node, at = "") {
  if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) yield* englishText(node[i], `${at}[${i}]`); return; }
  if (node && typeof node === "object") {
    if (typeof node.en === "string") { yield [at, node.en]; return; }
    for (const [k, v] of Object.entries(node)) if (k !== "sources" && k !== "diagram" && k !== "code") yield* englishText(v, at ? `${at}.${k}` : k);
  }
}

const findings = [];
for (const f of listConceptFiles()) {
  const c = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const [field, text] of englishText(c)) {
    for (const s of text.split(/\n+|(?<=[.!?])\s+(?=[A-Z(*])/)) {
      const kinds = VOLATILE.filter(([, re]) => re.test(s)).map(([k]) => k);
      // "at $3 per M input" in a worked example is a stated input, not a vendor's price; a price
      // tied to a vendor or model is a claim about the world. A model name alone is not a claim.
      // The same for status: "Beta(1,1)" or "a deprecated table" is not a product's lifecycle.
      for (const k of ["price", "status"]) if (kinds.includes(k) && !VENDOR.test(s)) kinds.splice(kinds.indexOf(k), 1);
      if (!kinds.some((k) => k !== "model")) continue;
      const date = newestDate(s);
      const issue = !date ? (LABELLED.test(s) ? null : "undated") : monthsBetween(date, now) > months ? "old" : null;
      if (issue) findings.push({ id: c.id, field, kinds, date, issue, text: s.length > 220 ? s.slice(0, 217) + "…" : s });
    }
  }
}

if (process.argv.includes("--json")) { console.log(JSON.stringify(findings, null, 2)); process.exit(0); }
const by = (issue) => findings.filter((x) => x.issue === issue);
for (const [issue, title] of [["undated", "No date: add one (\"as of Nov 2026\") or label it an assumption"], ["old", `Newest date older than ${months} months (today ${now}): re-verify`]]) {
  const xs = by(issue);
  if (!xs.length) continue;
  console.log(`\n${title} — ${xs.length}`);
  let last = "";
  for (const x of xs) {
    if (x.id !== last) { console.log(`  ${x.id}`); last = x.id; }
    console.log(`    [${x.kinds.join(",")}${x.date ? ` ${x.date}` : ""}] ${x.field}: ${x.text}`);
  }
}
const undatedPrices = by("undated").filter((x) => x.kinds.includes("price")).length;
console.log(`\nstale-facts: ${by("undated").length} undated (${undatedPrices} prices), ${by("old").length} older than ${months} months`);
process.exit(strict && undatedPrices ? 1 : 0);
