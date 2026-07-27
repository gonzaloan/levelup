#!/usr/bin/env node
/**
 * Spanish corrections, round 3 — the calques an evaluator found in the artifact
 * annotations written for the anti-wall-of-text pass.
 *
 * These are all MINE (the new `code.annotations`), not pre-existing corpus text.
 * Every replacement is exact-match and asserted to hit at least once, so a
 * silent no-op is impossible.
 *
 * Deliberately NOT changed, because they are correct Spanish and an over-eager
 * regex would damage real content:
 *   • "abortos" / "abortos-y-reintentos" for transaction aborts — the established
 *     term in Spanish database literature (15 pre-existing uses).
 *   • "páginas" for B-tree / WAL pages (46 uses).
 *   • "es cómo" / "es por qué" where the sentence genuinely predicates a manner
 *     or a cause ("la escalabilidad es cómo se sostiene ese comportamiento").
 *     The defect is only the calque form where English "is why/is how" was
 *     carried over as a copula + interrogative.
 *
 * Usage: node tools/fix-es-r3.cjs [--dry-run]
 */
const fs = require("node:fs");
const path = require("node:path");

const LESSONS = path.join(__dirname, "..", "src/content/data/lessons.json");

const FIXES = [
  // "is why" carried over literally. Spanish needs "es la razón por la que" /
  // "por eso" — "es por qué" reads as an unfinished indirect question.
  {
    from: "La demanda correlacionada es por qué las llamadas al control plane fallan justo cuando más las necesitas.",
    to: "La demanda correlacionada es la razón por la que las llamadas al control plane fallan justo cuando más las necesitas.",
  },
  {
    from: "Cargar el trabajo de plataforma al inicio es por qué el 70% se sintió como nada entregado.",
    to: "Cargar el trabajo de plataforma al inicio es la razón por la que el 70% se sintió como nada entregado.",
  },
  {
    from: "La complicación es por qué la situación es un problema AHORA.",
    to: "La complicación explica por qué la situación es un problema AHORA.",
  },
  // "is how" carried over literally.
  {
    from: "Decir esto explícitamente es cómo una revisión deja de expandirse a todo lo que toca.",
    to: "Decir esto explícitamente es lo que evita que una revisión se expanda a todo lo que toca.",
  },
  // "page" as a verb: in Spanish "paginar" means to number pages. On-call
  // vocabulary is "alertar" / "una alerta".
  {
    from: "qué pagina, qué congela y qué queda en un panel",
    to: "qué alerta, qué congela y qué queda en un panel",
  },
  {
    from: "Las páginas por causa enseñan a ignorar el pager",
    to: "Las alertas por causa enseñan a ignorar el pager",
  },
  // NOTE on "aborto": the evaluator flagged it in the gameday artifact, and it
  // was a real defect — "aborto" means abortion in Spanish, so a chaos
  // experiment gets an "interrupción". That artifact has since been rewritten
  // for its numbers and already says "interrupción automática", so there is
  // nothing left to fix here. The 15 remaining uses of "abortos" in the corpus
  // are TRANSACTION aborts, which is the correct Spanish term — replacing those
  // would be the damaging kind of over-correction.

  // "triar" is not a Spanish verb; the noun "triaje" is standard (and the same
  // lesson's authored example already uses it).
  {
    from: "Agrupa por regla antes de triar.",
    to: "Agrupa por regla antes de hacer triaje.",
  },
  // Mistranslation: the English refers to the two EXPENSIVE DEPENDENCIES (data
  // format, operational model), not to "the two sides".
  {
    from: "La regla apunta a la dependencia barata y deja intactas las dos caras.",
    to: "La regla apunta a la dependencia barata y deja intactas las dos costosas.",
  },
];

function main() {
  const dry = process.argv.includes("--dry-run");
  let src = fs.readFileSync(LESSONS, "utf8");
  let applied = 0;

  for (const { from, to } of FIXES) {
    // JSON-encode so the search matches the stored form (escapes, unicode).
    const needle = JSON.stringify(from).slice(1, -1);
    const repl = JSON.stringify(to).slice(1, -1);
    const count = src.split(needle).length - 1;
    if (count === 0) throw new Error(`not found: ${from.slice(0, 60)}…`);
    src = src.split(needle).join(repl);
    applied += count;
    console.log(`  ${count}x ${from.slice(0, 58)}…`);
  }

  // Cheap structural check before writing 3MB back: it must still parse, and the
  // lesson count must not have changed.
  const parsed = JSON.parse(src);
  if (parsed.lessons.length !== 35) throw new Error(`lesson count changed: ${parsed.lessons.length}`);

  if (dry) { console.log(`\n✓ dry run: ${applied} replacement(s) would apply.`); return; }
  fs.writeFileSync(LESSONS, src, "utf8");
  console.log(`\n✓ wrote lessons.json: ${applied} Spanish correction(s)`);
}

main();
