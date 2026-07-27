#!/usr/bin/env node
/**
 * Spanish corrections, round 4 — the residuals a third review round found.
 *
 * Two of these are mine and one is a REGRESSION of a fix I already shipped:
 * `tools/fix-es-r3.cjs` replaced "La complicación es por qué…" with "explica por
 * qué…", and one commit later I rewrote that artifact for an unrelated reason and
 * typed the calque back in. A one-shot replacement script cannot prevent that,
 * which is why `tests/es-calques.test.ts` now enforces these forms on every run.
 *
 * The rest are consistency-within-one-pane problems: the same word rendered two
 * ways in the same concept, which a native reader reads as a typo.
 *
 * Usage: node tools/fix-es-r4.cjs [--dry-run]
 */
const fs = require("node:fs");
const path = require("node:path");

const LESSONS = path.join(__dirname, "..", "src/content/data/lessons.json");

const FIXES = [
  // Regression of an r3 fix, reintroduced by the SCQA artifact rewrite.
  {
    from: "La complicación es por qué la situación es un problema AHORA.",
    to: "La complicación explica por qué la situación es un problema AHORA.",
  },
  // "triar" is not a Spanish verb. The corpus already uses "triaje" correctly
  // elsewhere, and one concept had BOTH forms two fields apart.
  {
    from: "Un VP que tría 60 correos decide aquí.",
    to: "Un VP que revisa 60 correos decide aquí.",
  },
  {
    from: "Agrupa por clase antes de triar",
    to: "Agrupa por clase antes de hacer triaje",
  },
  {
    from: "una cola de narrativas se puede triar de una forma en que una cola de átomos",
    to: "una cola de narrativas se puede clasificar de una forma en que una cola de átomos",
  },
  {
    from: "Triar secuencias de ataque",
    to: "Clasificar secuencias de ataque",
  },
  // The concept's own example.walkthrough.es says "la declaración"; the artifact
  // said "atestación" about the same document, on the same pane.
  {
    from: "el que invalida una atestación en silencio",
    to: "el que invalida una declaración en silencio",
  },
  // Pre-existing, and the same defect the gameday caption had: a stop condition
  // is an "interrupción". Found by the new test, not by review — which is the
  // point of having the test.
  {
    from: "Hacer canary sin aborto automático",
    to: "Hacer canary sin interrupción automática",
  },
];

function main() {
  const dry = process.argv.includes("--dry-run");
  let src = fs.readFileSync(LESSONS, "utf8");
  let applied = 0;

  for (const { from, to } of FIXES) {
    const needle = JSON.stringify(from).slice(1, -1);
    const repl = JSON.stringify(to).slice(1, -1);
    const count = src.split(needle).length - 1;
    if (count === 0) throw new Error(`not found: ${from.slice(0, 60)}…`);
    src = src.split(needle).join(repl);
    applied += count;
    console.log(`  ${count}x ${from.slice(0, 58)}…`);
  }

  const parsed = JSON.parse(src);
  if (parsed.lessons.length !== 35) throw new Error(`lesson count changed: ${parsed.lessons.length}`);

  if (dry) { console.log(`\n✓ dry run: ${applied} replacement(s) would apply.`); return; }
  fs.writeFileSync(LESSONS, src, "utf8");
  console.log(`\n✓ wrote lessons.json: ${applied} Spanish correction(s)`);
}

main();
