#!/usr/bin/env node
/**
 * tools/selftest-inventory.cjs — does the inventory's detection actually detect?
 *
 * The duplication detector went from 595 pairs to 1 after a real bug fix, and
 * the Spanish detector reports 0 flags. Both of those are the numbers a BROKEN
 * detector produces too. This replays known defects through the same functions
 * and fails if any of them slips through.
 *
 *   node tools/selftest-inventory.cjs
 */
const fs = require("fs");
const path = require("path");

// Re-derive the detector internals by loading the script's source and pulling out
// the functions under test. Simpler and more honest than exporting them: this
// tests the code that actually ships, not a copy.
const src = fs.readFileSync(path.join(__dirname, "inventory.cjs"), "utf8");
const slice = (from, to) => {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`selftest cannot locate ${from} — inventory.cjs changed shape`);
  return src.slice(a, b);
};
const harness = [
  slice("const words = (s) =>", "/** Reading minutes"),
  slice("const CALQUES = [", "/** The five-section"),
  slice("const norm = (s) =>", "/** The authored text"),
].join("\n");
const ctx = {};
new Function("exports", `${harness}\nexports.words=words;exports.esSignals=esSignals;exports.shingle=shingle;exports.jaccard=jaccard;`)(ctx);
const { esSignals, shingle, jaccard } = ctx;

let failures = 0;
const check = (name, pass, detail) => {
  if (!pass) { failures++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ✓ ${name}`);
};

// ── 1. Spanish detector: replay the defects this project actually shipped ─────
// Every string below is a real defect class from the project's history
// (deploy/fix-calques.cjs, tests/es-calques.test.ts, the 99-calque release).
console.log("\nSpanish defect replay (must FLAG):");
const MUST_FLAG = [
  ["robusto calque", "El sistema es robusto frente a fallos de red y mantiene la respuesta."],
  ["robustez calque", "La robustez del pipeline depende de reintentos idempotentes."],
  ["correctitud calque", "Verificamos la correctitud del resultado antes de publicarlo."],
  ["librería calque", "Instala la librería de cliente y configura el timeout por defecto."],
  ["eventualmente false friend", "El trabajo eventualmente falla cuando la cola se llena por completo."],
  ["machine-translated stub (no diacritics)", "The system uses a queue to absorb bursts of traffic and then drains the backlog at a steady rate, which keeps the database from falling over during a spike in orders from the storefront."],
  ["missing Spanish", ""],
];
for (const [name, text] of MUST_FLAG) {
  const flags = esSignals(text);
  check(name, flags.length > 0, `got no flags for ${JSON.stringify(text.slice(0, 50))}`);
}

console.log("\nCorrect Spanish (must NOT flag):");
// The five accent-free entries below are VERBATIM shipped Spanish that an
// earlier "no diacritics past 25 words" rule flagged. A gate that fires on
// correct content trains people to bypass the gate, so they are now the
// regression fixtures for the rule that replaced it.
const MUST_PASS = [
  ["authored prose with diacritics", "El sistema absorbe ráfagas con una cola y drena el rezago a ritmo constante, así la base de datos no se cae durante un pico de pedidos."],
  ["eventualmente consistente is correct", "La réplica es eventualmente consistente, así que una lectura inmediata puede devolver el valor anterior."],
  ["short line, no accents needed", "Chunk fijo de 512 tokens."],
  ["shipped: mmr-diversity-reranking (29w, zero accents)", "Reordenar un conjunto de candidatos con un puntaje que suma similitud con la consulta y resta similitud con lo ya seleccionado, para que la lista final deje de repetirse."],
  ["shipped: agent-run-as-span-tree (32w, zero accents)", "Una corrida de agente registrada como spans anidados, donde un span de workflow contiene invocaciones de agente y cada una contiene su plan, sus llamadas al modelo y sus ejecuciones de tools."],
  ["shipped: kv-cache-memory-cost (26w, zero accents)", "Las claves y los valores de cada token ya procesado, guardados en memoria de la GPU para que cada token nuevo atienda al pasado sin recalcularlo."],
  ["shipped: external-memory-notes (27w, zero accents)", "El agente escribe su estado en archivos fuera de la ventana de contexto y los vuelve a leer, para que el progreso sobreviva al reinicio del contexto."],
  ["shipped: ttft-vs-itl-vs-throughput (32w, zero accents)", "Tres objetivos de serving que se miden distinto: tiempo hasta el primer token, tiempo promedio entre tokens posteriores y total de tokens de salida por segundo entre todos los requests en vuelo."],
  ["shipped: just-in-time-context-retrieval (26w)", "Mantener en contexto identificadores como rutas, consultas o nombres de herramientas, y traer el contenido completo solo en el momento en que el modelo lo necesita."],
  ["Spanish carrying heavy English technical nouns", "El retrieval con hybrid search y reranking mejora el recall, pero el chunking fijo rompe la tabla y el grounding se degrada."],
];
for (const [name, text] of MUST_PASS) {
  const flags = esSignals(text);
  check(name, flags.length === 0, `false positive: ${JSON.stringify(flags)}`);
}

// ── 2. Duplication detector: does it find a duplicate it should? ──────────────
console.log("\nDuplication detector:");
const A = "Retrieval augmented generation grounds a model answer in documents fetched from an index at request time, so the answer cites text the model never memorised during training.";
const NEAR = "Retrieval augmented generation grounds the model answer in documents fetched from an index at request time, which means the answer cites text the model never memorised in training.";
const FAR = "Backpressure is the signal a saturated consumer sends upstream so producers slow down instead of filling an unbounded queue until memory runs out.";
const simNear = jaccard(shingle(A), shingle(NEAR));
const simFar = jaccard(shingle(A), shingle(FAR));
check("near-identical prose scores >= 0.42", simNear >= 0.42, `scored ${simNear.toFixed(3)}`);
check("unrelated prose scores < 0.42", simFar < 0.42, `scored ${simFar.toFixed(3)}`);

// ── 3. The regression that motivated this file ────────────────────────────────
// Two checkpoints whose only shared text is the label the inventory generates
// must NOT be called duplicates.
console.log("\nGenerated-label regression (the 595-pair bug):");
const lbl1 = shingle("technical-depth L4 checkpoint 8 graded judgment items over 6 concepts");
const lbl2 = shingle("systems-architecture L6 checkpoint 8 graded judgment items over 6 concepts");
const simLbl = jaccard(lbl1, lbl2);
check("generated checkpoint labels do not match each other", simLbl < 0.42, `scored ${simLbl.toFixed(3)}`);

// ── 4. The min-token floor must actually suppress thin units ──────────────────
console.log("\nMin-token floor:");
check("a 4-word unit produces < 12 tokens", shingle("Fixed size chunking strategy").size < 12, "thin unit would be compared");

// ── 5. Live data: the detectors must find the things we know are there ────────
console.log("\nLive-data sanity:");
const inv = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "transformation", "content-inventory.json"), "utf8"));
const spine = inv.units.filter((u) => u.current_type === "spine-concept");
check("every spine concept has authored English prose", spine.every((u) => u.language_quality_en.words > 0),
  `${spine.filter((u) => !u.language_quality_en.words).length} with zero words`);
check("every spine concept has authored Spanish prose", spine.every((u) => u.language_quality_es.words > 0),
  `${spine.filter((u) => !u.language_quality_es.words).length} with zero words`);
check("inventory covers all 178 spine concepts", spine.length === 178, `found ${spine.length}`);
check("no duplicate inventory ids", new Set(inv.units.map((u) => u.id)).size === inv.units.length);
check("every unit carries a recommended_action from the enum", inv.units.every((u) =>
  ["KEEP", "REWRITE", "SPLIT", "MERGE", "MOVE", "PROMOTE_TO_MODULE", "DEMOTE_TO_CODEX", "CONVERT_TO_PRACTICE", "CONVERT_TO_SHARED_FOUNDATION", "ARCHIVE", "NEEDS_RESEARCH"].includes(u.recommended_action)),
  "some action is outside the §1 enum");

console.log(failures === 0 ? "\n✓ inventory self-test passed" : `\n✗ ${failures} self-test failure(s)`);
process.exit(failures === 0 ? 0 : 1);
