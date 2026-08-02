#!/usr/bin/env node
/**
 * tools/selftest-merge-checks.cjs — does the merge validator catch real bugs?
 *
 * `merge-checks.cjs --check` passes on all 290 shipped checks. So would a
 * validator that checks nothing. This feeds it deliberately broken batches, one
 * defect per fixture, and fails if any of them merges cleanly.
 *
 * Every fixture below is a defect class that has actually occurred in this
 * project (wrong i18n nesting, out-of-range indices, a merge script writing a
 * changelog note into content, calques reintroduced by a fleet) or one the
 * validator explicitly promises to stop.
 *
 *   node tools/selftest-merge-checks.cjs
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const MERGE = path.join(__dirname, "merge-checks.cjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lu-checkfix-"));

/** A structurally perfect check, used as the base every fixture mutates. */
const good = () => ({
  id: "chk-cell-based-architecture-9",
  concept: "cell-based-architecture",
  kind: "categorize",
  track: "general",
  prompt: {
    en: "Sort each failure: is it contained inside one cell, or does it cross every cell at once?",
    es: "Clasifica cada fallo: ¿queda contenido dentro de una celda o cruza todas las celdas a la vez?",
  },
  explain: {
    en: "A cell contains a fault when nothing it owns is shared. The moment two cells read the same config store or the same global table, a bad write there reaches both, and the cell boundary stops buying you anything.",
    es: "Una celda contiene un fallo cuando nada de lo suyo es compartido. En el momento en que dos celdas leen el mismo almacén de configuración o la misma tabla global, una escritura mala ahí alcanza a ambas, y el límite de celda deja de comprarte algo.",
  },
  buckets: [
    { en: "Contained in one cell", es: "Contenido en una celda" },
    { en: "Crosses every cell", es: "Cruza todas las celdas" },
  ],
  items: [
    { label: { en: "One cell's database runs out of connections", es: "La base de datos de una celda se queda sin conexiones" }, bucket: 0 },
    { label: { en: "A bad config value is written to the shared parameter store", es: "Se escribe un valor de configuración malo en el almacén de parámetros compartido" }, bucket: 1 },
    { label: { en: "A deploy to cell 3 introduces a crash loop", es: "Un despliegue a la celda 3 introduce un ciclo de caídas" }, bucket: 0 },
    { label: { en: "The global router starts sending all traffic to one cell", es: "El router global empieza a mandar todo el tráfico a una celda" }, bucket: 1 },
  ],
});

/**
 * Each fixture: [name, mutate(check) -> void|check, mustFailOn]
 * `mustFailOn` is a substring the validator's stderr/stdout must contain, so the
 * test proves it failed for the RIGHT reason and not incidentally.
 */
const FIXTURES = [
  ["i18n nested at the wrong level (the real fleet bug)", (c) => {
    c.buckets = [{ en: "Contained", es: "Contenido" }, { en: "Crosses", es: "Cruza" }];
    c.items = [{ en: { label: "x" }, bucket: 0 }, { en: { label: "y" }, bucket: 1 }, { en: { label: "z" }, bucket: 0 }, { en: { label: "w" }, bucket: 1 }];
  }, "label"],

  ["English left in the Spanish field", (c) => {
    c.explain.es = "A cell contains a fault when nothing it owns is shared, and the moment two cells read the same configuration store a bad write there reaches both of them at once.";
  }, "reads as English"],

  ["calque reintroduced", (c) => {
    c.explain.es = "Una celda hace el sistema mas robusto porque aisla el fallo y evita que la falla se propague a todas las demas celdas del sistema completo.";
  }, "calque"],

  ["eventualmente as a false friend", (c) => {
    c.explain.es = "Si la celda se queda sin conexiones, eventualmente el balanceador deja de mandarle tráfico y el fallo queda contenido dentro de esa celda.";
  }, "false friend"],

  ["concept slug is not in the spine", (c) => { c.concept = "totally-made-up-concept"; c.id = "chk-totally-made-up-concept-1"; }, "not a spine slug"],

  ["bucket index out of range", (c) => { c.items[2].bucket = 7; }, "out of range"],

  ["a bucket nothing sorts into (a decoy boundary)", (c) => {
    c.buckets.push({ en: "Third bucket", es: "Tercer bucket" });
  }, "has no items"],

  ["id does not carry its own concept slug", (c) => { c.id = "chk-some-other-concept-1"; }, "does not carry its own concept"],

  ["invalid track", (c) => { c.track = "cloud"; }, "is not one of"],

  ["cloze: segments and answers disagree", (c) => {
    delete c.buckets; delete c.items;
    c.kind = "cloze";
    c.segments = [{ en: "A ", es: "Una " }, { en: " contains a fault.", es: " contiene un fallo." }];
    c.bank = [{ en: "cell", es: "celda" }, { en: "region", es: "región" }, { en: "zone", es: "zona" }];
    c.answers = [0, 1]; // 2 answers needs 3 segments
  }, "must be answers"],

  ["cloze: answer index past the end of the bank", (c) => {
    delete c.buckets; delete c.items;
    c.kind = "cloze";
    c.segments = [{ en: "A ", es: "Una " }, { en: " contains a fault.", es: " contiene un fallo." }];
    c.bank = [{ en: "cell", es: "celda" }, { en: "region", es: "región" }, { en: "zone", es: "zona" }];
    c.answers = [5];
  }, "out of range"],

  ["cloze: every segment empty (no sentence at all)", (c) => {
    delete c.buckets; delete c.items;
    c.kind = "cloze";
    c.segments = [{ en: "", es: "" }, { en: "", es: "" }];
    c.bank = [{ en: "cell", es: "celda" }, { en: "region", es: "región" }, { en: "zone", es: "zona" }];
    c.answers = [0];
  }, "no sentence"],

  ["match: the same right-hand item matched twice", (c) => {
    delete c.buckets; delete c.items;
    c.kind = "match";
    c.left = [{ en: "Cell", es: "Celda" }, { en: "Shard", es: "Shard" }];
    c.right = [{ en: "A full stack copy", es: "Una copia completa del stack" }, { en: "A slice of one dataset", es: "Una porción de un dataset" }];
    c.pairs = [[0, 0], [1, 0]];
  }, "matched twice"],

  ["match: a left item with no pair", (c) => {
    delete c.buckets; delete c.items;
    c.kind = "match";
    c.left = [{ en: "Cell", es: "Celda" }, { en: "Shard", es: "Shard" }, { en: "Zone", es: "Zona" }];
    c.right = [{ en: "A full stack copy", es: "Una copia completa del stack" }, { en: "A slice of one dataset", es: "Una porción de un dataset" }, { en: "A failure domain", es: "Un dominio de fallo" }];
    c.pairs = [[0, 0], [1, 1]];
  }, "every left item needs a match"],

  // The id below is read from checks.json at run time rather than hardcoded. The
  // first version of this fixture hardcoded `chk-cell-based-architecture-1`,
  // which does not exist — cloud-platform has no checks, which is the very gap
  // this batch is filling. The fixture "passed" the merge because there was
  // nothing to clobber, and reported the VALIDATOR as blind when the FIXTURE was
  // wrong. A test fixture asserting a precondition it never verified.
  ["clobbering an id that already ships", (c) => {
    const shipped = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "content", "data", "checks.json"), "utf8")).checks;
    const victim = shipped[0];
    if (!victim) throw new Error("checks.json is empty — cannot build the clobber fixture");
    c.id = victim.id;
    c.concept = victim.concept; // keep the id/concept invariant so we test ONLY clobbering
  }, "refusing to clobber"],

  ["missing the Spanish side entirely", (c) => { delete c.explain.es; }, "explain.es"],
];

let failures = 0;
const run = (payload) => {
  const f = path.join(tmp, `fx-${Math.abs(JSON.stringify(payload).length)}-${Math.random().toString(36).slice(2, 8)}.json`);
  fs.writeFileSync(f, JSON.stringify(payload, null, 1));
  try {
    const out = execFileSync(process.execPath, [MERGE, "--dry", f], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout || ""}${e.stderr || ""}` };
  }
};

// ── 0. The good fixture must MERGE CLEANLY, or every other result is meaningless
console.log("\nbaseline — a correct check must pass:");
{
  const r = run({ checks: [good()] });
  if (r.code !== 0) { failures++; console.log(`  ✗ the known-good fixture was REJECTED:\n${r.out.split("\n").map((l) => `      ${l}`).join("\n")}`); }
  else console.log("  ✓ correct check accepted");
}

// ── 1. Every defect fixture must be REJECTED, for the right reason
console.log("\ndefect fixtures — each must be rejected:");
for (const [name, mutate, reason] of FIXTURES) {
  const c = good();
  mutate(c);
  const r = run({ checks: [c] });
  if (r.code === 0) {
    failures++;
    console.log(`  ✗ ${name} — MERGED CLEANLY (validator is blind to this)`);
  } else if (!r.out.includes(reason)) {
    failures++;
    console.log(`  ✗ ${name} — rejected, but not for "${reason}". Got:`);
    console.log(r.out.split("\n").filter((l) => l.includes("✗")).map((l) => `      ${l.trim()}`).join("\n"));
  } else {
    console.log(`  ✓ ${name}`);
  }
}

// ── 2. Shipped content must stay clean (the false-positive guard)
console.log("\nfalse-positive guard:");
try {
  execFileSync(process.execPath, [MERGE, "--check"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  console.log("  ✓ all shipped checks still validate");
} catch (e) {
  failures++;
  console.log("  ✗ the validator now rejects shipped content:");
  console.log(`${e.stdout || ""}`.split("\n").filter((l) => l.includes("✗")).map((l) => `      ${l.trim()}`).join("\n"));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures === 0
  ? `\n✓ merge-checks self-test passed (${FIXTURES.length} defect classes caught, shipped content clean)`
  : `\n✗ ${failures} self-test failure(s)`);
process.exit(failures === 0 ? 0 : 1);
