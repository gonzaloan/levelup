#!/usr/bin/env node
/**
 * Enforces the glossary against the shipped content (section 24: "missing glossary
 * compliance").
 *
 * A glossary that nothing checks is a document. This makes each `avoid` entry a build
 * failure, so a calque cannot reach a learner through a well-meaning translation pass.
 *
 * FOUR CHECKS
 *  1. BANNED RENDERINGS — an `avoid` string appearing in Spanish prose is an error.
 *     This is the one that has teeth, which is exactly why the `avoid` lists were
 *     built by reading sentences rather than by counting. `límite` outnumbers
 *     `guardrail` 230 to 31 and is NOT banned, because it means "threshold": banning
 *     it would have failed 230 correct sentences.
 *  2. SHAPE — every entry has the six fields section 13 requires, and no term is
 *     declared twice (including via an alias).
 *  3. USAGE HONESTY — the `usage` block must agree with a fresh measurement. It is
 *     generated, so a mismatch means someone hand-edited the JSON, and a hand-edited
 *     count is how a glossary starts lying.
 *
 *     `npm run content:check` runs gen-glossary.cjs immediately before this script, so
 *     in the pipeline a stale count is regenerated rather than reported. That is
 *     deliberate: the counts go stale on ANY content edit, and telling an author who
 *     added a lesson to go run a second command teaches them to distrust the gate. The
 *     hand-edit case is still covered — selftest-glossary.cjs invokes THIS script
 *     directly with no regeneration, and one of its 24 checks corrupts a count and
 *     requires the failure. So the detection lives where a person cannot route around
 *     it, and the pipeline stays quiet about a difference it can fix itself.
 *  4. SELF-CONSISTENCY — a term marked `translate: false` must not have its own
 *     canonical form in its `avoid` list, and `spanish_usage` must equal the canonical
 *     form exactly when `translate: false`.
 *
 * BASELINE
 * `glossary-baseline.txt` lists banned renderings that already ship, as `term|rendering`.
 * A listed pair warns; an unlisted pair fails. The list may only shrink — the project
 * rule is that a baseline records debt, and adding a line to make a build pass is
 * forbidden.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { corpus, count, wordRe, classify } = require("./glossary-scan.cjs");
/** A newline as a binding, not an escape — see the note in tools/gen-docs.cjs. */
const NL = String.fromCharCode(10);

const ROOT = path.join(__dirname, "..");
const BASELINE = path.join(__dirname, "glossary-baseline.txt");
const REQUIRED = ["term", "canonical", "spanish_usage", "translate", "first_use_explanation", "aliases", "avoid"];

const errors = [];
const warnings = [];

function load(lang) {
  const p = path.join(ROOT, "content", `glossary.${lang}.json`);
  if (!fs.existsSync(p)) {
    errors.push(`content/glossary.${lang}.json is missing — run node tools/gen-glossary.cjs`);
    return null;
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const gEn = load("en");
const gEs = load("es");
if (!gEn || !gEs) {
  for (const e of errors) console.error(`ERROR ${e}`);
  process.exit(1);
}

// ── 2. shape ─────────────────────────────────────────────────────────────
// Runs FIRST and short-circuits, because everything below assumes the fields exist.
// The self-test caught why this ordering matters: deleting `spanish_usage` crashed
// inside the regex builder in glossary-scan.cjs, and deleting `avoid` crashed on
// `for (const bad of t.avoid)`. Both defects WERE detected — the exit code was
// non-zero — but the author got a stack trace pointing at a different file instead of
// "term X is missing spanish_usage". A gate whose failure message is a stack trace
// does not tell you what to fix.
const seen = new Map();
for (const g of [gEn, gEs]) {
  for (const t of g.terms) {
    for (const f of REQUIRED) {
      if (t[f] === undefined) errors.push(`${g.language}/${t.term} is missing required field \`${f}\``);
    }
    if (typeof t.first_use_explanation !== "string" || t.first_use_explanation.length < 25) {
      errors.push(`${g.language}/${t.term}.first_use_explanation is too short to explain anything`);
    }
    if (!Array.isArray(t.avoid) || !Array.isArray(t.aliases)) {
      errors.push(`${g.language}/${t.term}: avoid and aliases must be arrays`);
    }
  }
}
if (errors.length) {
  for (const e of errors) console.error(`ERROR ${e}`);
  console.error(`\nglossary: ${errors.length} structural error(s) — the remaining checks need these fields.`);
  process.exit(1);
}

// The two files must describe the SAME decisions; only the explanation is localized.
if (gEn.terms.length !== gEs.terms.length) {
  errors.push(`en has ${gEn.terms.length} terms, es has ${gEs.terms.length} — they must agree`);
}
for (let i = 0; i < Math.min(gEn.terms.length, gEs.terms.length); i++) {
  const a = gEn.terms[i], b = gEs.terms[i];
  if (a.term !== b.term) { errors.push(`term ${i} differs between files: ${a.term} vs ${b.term}`); continue; }
  for (const f of ["canonical", "spanish_usage", "translate"]) {
    if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) {
      errors.push(`${a.term}.${f} differs between the en and es files — it is a shared field`);
    }
  }
  if (a.first_use_explanation === b.first_use_explanation) {
    errors.push(`${a.term}.first_use_explanation is identical in both files — the es one is untranslated`);
  }
}

for (const t of gEn.terms) {
  const keys = [t.term.toLowerCase(), ...(t.aliases ?? []).map((a) => a.toLowerCase())];
  for (const k of keys) {
    if (seen.has(k) && seen.get(k) !== t.term) {
      errors.push(`"${k}" is claimed by both ${seen.get(k)} and ${t.term}`);
    }
    seen.set(k, t.term);
  }
}

// ── 4. self-consistency ──────────────────────────────────────────────────
for (const t of gEn.terms) {
  const lower = (s) => String(s).toLowerCase();
  if (!t.translate && lower(t.spanish_usage) !== lower(t.canonical)) {
    errors.push(`${t.term} is translate:false but spanish_usage is "${t.spanish_usage}" — pick one`);
  }
  if (t.translate && lower(t.spanish_usage) === lower(t.canonical)) {
    errors.push(`${t.term} is translate:true but spanish_usage repeats the English form`);
  }
  for (const bad of t.avoid) {
    if (lower(bad) === lower(t.canonical) || lower(bad) === lower(t.spanish_usage)) {
      errors.push(`${t.term} bans "${bad}", which is its own canonical or Spanish form`);
    }
  }
}

// ── 3. usage honesty ─────────────────────────────────────────────────────
const c = corpus();
const EN = c.en.join("\n");
const ES = c.es.join("\n");

for (const t of gEn.terms) {
  if (!t.usage) { errors.push(`${t.term} has no measured usage block`); continue; }
  const en = count(EN, t.term);
  const esCanonical = count(ES, t.spanish_usage);
  const englishFormInSpanish = count(ES, t.term);
  const { verdict } = classify(en, englishFormInSpanish);
  const fresh = { en, esCanonical, englishFormInSpanish, verdict };
  for (const [k, v] of Object.entries(fresh)) {
    if (t.usage[k] !== v) {
      errors.push(
        `${t.term}.usage.${k} says ${JSON.stringify(t.usage[k])} but the corpus measures ${JSON.stringify(v)}` +
        ` — regenerate rather than hand-editing`
      );
    }
  }
}

// ── 1. banned renderings in shipped Spanish prose ────────────────────────
const baseline = new Set(
  fs.existsSync(BASELINE)
    ? fs.readFileSync(BASELINE, "utf8").split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean)
    : []
);
const usedBaseline = new Set();
const hits = [];

for (const t of gEn.terms) {
  for (const bad of t.avoid) {
    const n = count(ES, bad);
    if (!n) continue;
    const key = `${t.term}|${bad}`;
    if (baseline.has(key)) {
      usedBaseline.add(key);
      warnings.push(`${t.term}: "${bad}" appears ${n}× in Spanish prose (baselined)`);
    } else {
      hits.push({ term: t.term, bad, n, key });
    }
  }
}
for (const h of hits) {
  errors.push(
    `${h.term}: the banned rendering "${h.bad}" appears ${h.n}× in Spanish prose. ` +
    `Use "${gEn.terms.find((t) => t.term === h.term).spanish_usage}" instead.`
  );
}

// The list may only SHRINK, and that is now enforced rather than asserted in a comment.
// The committed version is the ceiling: a line that is not in HEAD is a line someone added
// to silence a failure, which converts a defect into a permission. Growth was previously
// unchecked — appending one pair and regenerating made a shipped calque pass.
{
  let committed = null;
  try {
    committed = execFileSync("git", ["show", "HEAD:tools/glossary-baseline.txt"], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    });
  } catch { /* new file, shallow clone, or no git — cannot compare, so do not block */ }
  if (committed !== null) {
    const parse = (t) => new Set(t.split(NL).map((l) => l.replace(/#.*/, "").trim()).filter(Boolean));
    const was = parse(committed);
    const added = [...baseline].filter((k) => !was.has(k));
    if (added.length) {
      errors.push(
        `glossary-baseline.txt GREW by ${added.length} line(s): ${added.join(", ")}. ` +
        `A baseline records existing debt and may only shrink — fix the content instead.`
      );
    }
  }
}

const stale = [...baseline].filter((k) => !usedBaseline.has(k));
if (stale.length) {
  errors.push(
    `glossary-baseline.txt lists ${stale.length} pair(s) that no longer appear — the list must shrink, ` +
    `so delete them: ${stale.join(", ")}`
  );
}

// ── report ───────────────────────────────────────────────────────────────
for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);
console.log(
  `\nglossary: ${gEn.terms.length} terms, ` +
  `${gEn.terms.reduce((a, t) => a + t.avoid.length, 0)} banned renderings checked against ` +
  `${c.es.length} Spanish strings — ${errors.length} error(s), ${warnings.length} warning(s)`
);
process.exit(errors.length ? 1 : 0);
