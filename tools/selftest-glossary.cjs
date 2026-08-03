#!/usr/bin/env node
/**
 * Does check-glossary.cjs actually catch the defects it was built for?
 *
 * The project rule is that a new gate must be measured against the defects it exists
 * for before it is trusted. An earlier check in this repo passed on a fully restored
 * defect because the test rebuilt what it should have observed, and another reported
 * 595 false duplicates because nobody attacked it.
 *
 * So each case below breaks the glossary in ONE way and asserts the validator fails.
 * The last group is the more important half: correct content that must NOT fail, since
 * a gate that fires on valid input gets disabled by the next person who hits it.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const EN = path.join(ROOT, "content", "glossary.en.json");
const ES = path.join(ROOT, "content", "glossary.es.json");
const BASE = path.join(__dirname, "glossary-baseline.txt");

const originals = { [EN]: fs.readFileSync(EN, "utf8"), [ES]: fs.readFileSync(ES, "utf8"), [BASE]: fs.readFileSync(BASE, "utf8") };
const restore = () => { for (const [f, t] of Object.entries(originals)) fs.writeFileSync(f, t); };

/** Runs the validator. Returns {ok, out}. */
function run() {
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, "check-glossary.cjs")], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: `${e.stdout || ""}${e.stderr || ""}` };
  }
}

let pass = 0;
const failures = [];

/**
 * @param name  what is being asserted
 * @param mutate  breaks the content; return value ignored
 * @param expect  a substring the error message must contain, or null to just require failure
 */
function defect(name, mutate, expect) {
  restore();
  mutate();
  const { ok, out } = run();
  if (ok) {
    failures.push(`${name}: the validator PASSED on a broken glossary`);
  } else if (expect && !out.includes(expect)) {
    failures.push(`${name}: failed, but not for the right reason — expected "${expect}"\n    got: ${out.split("\n").filter((l) => l.startsWith("ERROR"))[0] || out.slice(0, 200)}`);
  } else {
    pass++;
  }
  restore();
}

function accepts(name, mutate) {
  restore();
  mutate();
  const { ok, out } = run();
  if (!ok) failures.push(`${name}: the validator REJECTED valid content\n    ${out.split("\n").filter((l) => l.startsWith("ERROR")).slice(0, 2).join("\n    ")}`);
  else pass++;
  restore();
}

const readEn = () => JSON.parse(fs.readFileSync(EN, "utf8"));
const readEs = () => JSON.parse(fs.readFileSync(ES, "utf8"));
const writeEn = (g) => fs.writeFileSync(EN, JSON.stringify(g, null, 2) + "\n");
const writeEs = (g) => fs.writeFileSync(ES, JSON.stringify(g, null, 2) + "\n");
const find = (g, t) => g.terms.find((x) => x.term === t);

// ── 1. the headline defect: a banned rendering reaching a learner ─────────
// This is the whole point of the gate. `incrustación` is the calque of `embedding`
// and appears nowhere in the corpus, so banning something the corpus DOES contain is
// the way to prove the check reads real content rather than trusting the file.
defect("an un-baselined banned rendering that ships", () => {
  const g = readEn();
  // `latencia` ships 586 times; banning it must fail loudly.
  find(g, "embedding").avoid.push("latencia");
  writeEn(g);
}, 'the banned rendering "latencia" appears');

defect("a banned rendering removed from the baseline while still shipping", () => {
  fs.writeFileSync(BASE, originals[BASE].split("\n").filter((l) => !l.startsWith("blameless|")).join("\n"));
}, 'banned rendering "sin culpables" appears');

// ── 2. shape: the six fields section 13 requires ──────────────────────────
for (const field of ["canonical", "spanish_usage", "translate", "first_use_explanation", "aliases", "avoid"]) {
  defect(`a term missing \`${field}\``, () => {
    const g = readEn();
    delete find(g, "chunking")[field];
    writeEn(g);
  }, `missing required field \`${field}\``);
}

defect("a first_use_explanation too short to explain anything", () => {
  const g = readEn();
  find(g, "chunking").first_use_explanation = "splitting text";
  writeEn(g);
}, "too short");

defect("two terms claiming the same alias", () => {
  const g = readEn();
  find(g, "chunk").aliases.push("RAG");
  writeEn(g);
}, "is claimed by both");

// ── 3. self-consistency ──────────────────────────────────────────────────
defect("translate:false but spanish_usage differs from canonical", () => {
  const g = readEn(), h = readEs();
  for (const gg of [g, h]) find(gg, "chunking").spanish_usage = "troceado";
  writeEn(g); writeEs(h);
}, "pick one");

defect("translate:true but spanish_usage repeats the English", () => {
  const g = readEn(), h = readEs();
  for (const gg of [g, h]) find(gg, "latency").spanish_usage = "latency";
  writeEn(g); writeEs(h);
}, "repeats the English form");

defect("a term banning its own canonical form", () => {
  const g = readEn();
  find(g, "chunking").avoid.push("chunking");
  writeEn(g);
}, "its own canonical");

// ── 4. usage honesty — the numbers must be measured, not typed ────────────
defect("a hand-edited usage count", () => {
  const g = readEn();
  find(g, "chunking").usage.en = 9999;
  writeEn(g);
}, "regenerate rather than hand-editing");

defect("a usage block deleted entirely", () => {
  const g = readEn();
  delete find(g, "chunking").usage;
  writeEn(g);
}, "no measured usage block");

// ── 5. the two files must describe the SAME decisions ─────────────────────
defect("the es file disagreeing about translate", () => {
  const h = readEs();
  find(h, "chunking").translate = true;
  writeEs(h);
}, "differs between the en and es files");

defect("an untranslated Spanish first_use_explanation", () => {
  const g = readEn(), h = readEs();
  find(h, "chunking").first_use_explanation = find(g, "chunking").first_use_explanation;
  writeEs(h);
}, "untranslated");

defect("a term present in one file only", () => {
  const h = readEs();
  h.terms.splice(3, 1);
  writeEs(h);
}, null);

defect("a missing glossary file", () => fs.unlinkSync(EN), "is missing");

// ── 6. a stale baseline must shrink, never linger ─────────────────────────
defect("a baseline line for something that no longer ships", () => {
  fs.writeFileSync(BASE, originals[BASE] + "\nchunking|una-frase-que-nadie-escribio\n");
}, "must shrink");

// ── 7. correct content must be ACCEPTED ──────────────────────────────────
// The half that matters more. Each of these is a real property of the shipped corpus
// that an over-eager rule would break, and every one of them was an actual mistake in
// the first draft of the glossary.
accepts("the glossary exactly as it ships", () => {});

accepts("a term whose Spanish rival is an ordinary word with its own meaning", () => {
  // `rendimiento` means performance, `cola` means queue, `límite` means threshold.
  // None is banned, and adding them as ALIASES (not bans) must stay legal.
  const g = readEn(), h = readEs();
  for (const gg of [g, h]) find(gg, "throughput").aliases.push("requests per second");
  writeEn(g); writeEs(h);
});

accepts("a new term with an empty avoid list", () => {
  // The counts are MEASURED here, not typed.
  //
  // Two revisions got this wrong in opposite directions. The first wrote zeros, assuming
  // a term absent from the glossary is absent from the corpus; the validator rejected it
  // and was right, because `p50` ships. The second hardcoded the measured figure, which
  // then went stale the moment the scanner's file list widened and 781 more strings
  // entered the corpus — so a correct-content fixture started failing.
  //
  // A fixture that restates a number the tool derives is the same defect the tool exists
  // to catch, one level up. So it derives it.
  const { corpus, count, classify } = require("./glossary-scan.cjs");
  const c = corpus();
  const en = count(c.en.join("\n"), "p50");
  const es = count(c.es.join("\n"), "p50");
  const { verdict, ratio } = classify(en, es);
  const entry = (expl) => ({
    term: "p50", canonical: "p50", spanish_usage: "p50", translate: false,
    first_use_explanation: expl, aliases: ["median latency"], avoid: [],
    usage: { en, esCanonical: es, englishFormInSpanish: es, ratio: Number(ratio.toFixed(2)), verdict },
  });
  const g = readEn(), h = readEs();
  g.terms.push(entry("The latency half of all requests come in under — the typical case, not the problem."));
  h.terms.push(entry("La latencia bajo la que cae la mitad de las peticiones: el caso típico, no el problema."));
  writeEn(g); writeEs(h);
});

accepts("a term whose canonical form is an acronym with an expansion alias", () => {
  // Expansions are aliases, never bans — "objetivo de nivel de servicio (SLO)" IS the
  // first-use explanation section 13 asks for.
  const g = readEn(), h = readEs();
  for (const gg of [g, h]) find(gg, "SLO").aliases.push("objetivo de nivel de servicio");
  writeEn(g); writeEs(h);
});

// ── report ───────────────────────────────────────────────────────────────
restore();
const total = pass + failures.length;
for (const f of failures) console.error(`FAIL  ${f}`);
console.log(`\nselftest-glossary: ${pass}/${total} checks pass`);
if (failures.length) process.exit(1);
