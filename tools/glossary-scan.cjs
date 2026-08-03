#!/usr/bin/env node
/**
 * What does the Spanish edition ACTUALLY do with each industry term?
 *
 * WHY THIS TOOL EXISTS
 * Section 13 requires a glossary where each term declares `translate: false` and a
 * `spanish_usage`. That is a decision, and it must record the decision the corpus has
 * already made rather than impose a new one on 19,228 shipped Spanish strings.
 *
 * The measurement is a RATIO, not a count. Two mistakes to avoid:
 *
 *  1. Counting Spanish occurrences alone. `latency` appears 7 times in Spanish prose,
 *     which looks like "the corpus keeps it in English" until you see the 600 English
 *     occurrences: the Spanish edition says `latencia` and those 7 are the exception.
 *     A term is kept in English when Spanish uses it about as often as English does.
 *
 *  2. Using `\b`. JavaScript word boundaries are ASCII-only, so /\beval\b/ matches
 *     "evalúa" — the boundary falls between "l" and "ú". That inflates the count of
 *     the exact term being measured, in the exact language that has the accents. The
 *     first run reported 99 Spanish uses of `eval`; a third were conjugations of
 *     `evaluar`. Boundaries here include the Latin-Extended letter range.
 *
 * The interesting output is the third bucket. A term used in English 95 times and in
 * Spanish 36 is neither kept nor translated — it is INCONSISTENT, and inconsistency
 * across 178 concepts is what a glossary is for.
 */
const fs = require("node:fs");
const path = require("node:path");

const DATA = path.join(__dirname, "..", "src", "content", "data");
/**
 * Every content file with learner-facing prose — discovered, not listed.
 *
 * A hard-coded list was wrong twice. It first read 5 of 8 JSON files, hiding a shipped
 * calque in `builds.json`; the fix added the three missing names, and the accompanying
 * test compared the list against `readdirSync(...).filter(f => f.endsWith(".json"))` —
 * so BOTH the list and its guard still missed `gauntlet.ts`, which holds 24 Spanish
 * strings (boss names, the 30% red-team challenge) and is imported by CodeRedTeam.tsx.
 * One extension over, in exactly the class of error the guard was written to prevent.
 *
 * So the list is now derived from the directory. A new content file is scanned the day it
 * lands, and there is no list to forget to update. The .ts case is read as source and
 * mined for quoted strings on `en:`/`es:` keys, which is what its shape supports.
 */
const FILES = fs
  .readdirSync(DATA)
  .filter((f) => /\.(json|ts)$/.test(f) && !f.endsWith(".d.ts"))
  .sort();

/** Letters that must NOT count as a word boundary — ASCII plus Latin-1/Extended-A. */
const L = "A-Za-z0-9\\u00C0-\\u024F";
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** An accent-aware whole-word matcher. Hyphens and spaces inside a term are literal. */
function wordRe(term, flags = "gi") {
  return new RegExp(`(?<![${L}])${esc(term)}(?![${L}])`, flags);
}

/**
 * Collect every `en`/`es` leaf string, keeping the two languages separate.
 *
 * JSON files are walked structurally. `gauntlet.ts` is a TypeScript module, so it is
 * read as source and mined for `en: "…"` / `es: "…"` literals — less precise than a
 * parse, and precise enough to catch a banned rendering, which is the only thing this
 * corpus is used for.
 */
function corpus() {
  const out = { en: [], es: [] };
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string") {
        if (k === "en") out.en.push(v);
        else if (k === "es") out.es.push(v);
      } else walk(v);
    }
  };
  for (const f of FILES) {
    const p = path.join(DATA, f);
    if (!fs.existsSync(p)) continue;
    if (f.endsWith(".json")) { walk(JSON.parse(fs.readFileSync(p, "utf8"))); continue; }
    const src = fs.readFileSync(p, "utf8");
    for (const m of src.matchAll(/\b(en|es)\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
      out[m[1]].push(m[2].replace(/\\"/g, '"'));
    }
  }
  return out;
}

const count = (text, term) => (text.match(wordRe(term)) || []).length;

/**
 * Classify one term by how the Spanish edition treats it.
 *
 * `ratio` = spanish uses / english uses. Near 1 means Spanish keeps the English word.
 * Near 0 means Spanish has its own word. The middle band is the finding, not an error:
 * it means two authors made different calls on the same term.
 */
function classify(en, es) {
  if (en + es < 6) return { verdict: "rare", ratio: en ? es / en : 0 };
  const ratio = en ? es / en : (es ? Infinity : 0);
  if (ratio >= 0.5) return { verdict: "kept", ratio };
  if (ratio <= 0.15) return { verdict: "localized", ratio };
  return { verdict: "inconsistent", ratio };
}

module.exports = { wordRe, count, corpus, classify, L };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error("usage: node tools/glossary-scan.cjs [--sentences] <term> [term...]");
    process.exit(2);
  }

  // `--sentences` prints the real Spanish sentences a term appears in.
  //
  // This mode is the reason 42 wrong bans were caught. A count cannot tell you what a
  // word MEANS: `rendimiento` outnumbered `throughput` and turned out to mean
  // "performance"; `cola` outnumbered `tail` and means "queue". Before adding anything
  // to an `avoid` list, read the sentences.
  if (args[0] === "--sentences") {
    const c = corpus();
    const sentences = c.es.flatMap((s) => s.split(/(?<=[.;:])\s+/));
    for (const t of args.slice(1)) {
      const hits = sentences.filter((s) => wordRe(t, "i").test(s) && s.trim().length > 30);
      console.log(`\n### "${t}" — ${hits.length} sentences`);
      for (const h of hits.slice(0, 6)) console.log(`  · ${h.trim().slice(0, 180)}`);
    }
    process.exit(0);
  }

  const terms = args;
  const c = corpus();
  const EN = c.en.join("\n");
  const ES = c.es.join("\n");
  const rows = terms.map((t) => {
    const en = count(EN, t);
    const es = count(ES, t);
    return { term: t, en, es, ...classify(en, es) };
  });
  rows.sort((a, b) => b.ratio - a.ratio || b.en - a.en);
  const w = Math.max(...rows.map((r) => r.term.length));
  for (const r of rows) {
    console.log(
      `${r.term.padEnd(w)}  en ${String(r.en).padStart(4)}  es ${String(r.es).padStart(4)}` +
      `  ratio ${r.ratio.toFixed(2).padStart(5)}  ${r.verdict}`
    );
  }
  const by = {};
  for (const r of rows) by[r.verdict] = (by[r.verdict] || 0) + 1;
  console.log(`\n${JSON.stringify(by)}`);
}
