#!/usr/bin/env node
/**
 * tools/selftest-merge-codex.cjs — does the PRIMER gate catch real bugs?
 *
 * `merge-codex.cjs --check` passing on 11 shipped primers proves nothing on its
 * own: a validator that checks nothing would report exactly the same thing. This
 * feeds it deliberately broken primers, one defect per fixture, and fails if any
 * of them merges cleanly.
 *
 * Every fixture is either a defect class the contract was written to stop (the
 * measurements in docs/curriculum/PRIMER-CONTRACT.md) or one this project has
 * already shipped once at a different level — the total-partition fixture in
 * particular, because "absence is invisible to schema validators" is the most
 * expensive lesson in this codebase's history, and a families list that quietly
 * drops an entry is that same defect one level up.
 *
 * The last section is the FALSE-POSITIVE guard, and it matters as much as the
 * rest: a gate that fires on correct content trains people to bypass the gate.
 *
 *   node tools/selftest-merge-codex.cjs
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const MERGE = path.join(__dirname, "merge-codex.cjs");
const CODEX = path.join(__dirname, "..", "src", "content", "data", "codex.json");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lu-primerfix-"));

/**
 * The cluster the fixtures mutate: `vector-indexes`, read from the SHIPPED file.
 *
 * Read rather than hardcoded, and its entry slugs come from the real cluster, for
 * the reason written into selftest-merge-checks.cjs: a fixture that hardcodes a
 * slug asserts a precondition it never verified, and when the slug is wrong the
 * test reports the VALIDATOR as blind. Four entries is also the smallest cluster,
 * which is deliberately the hardest case for the family-of-one rule.
 */
const shipped = JSON.parse(fs.readFileSync(CODEX, "utf8"));
const TARGET = shipped.clusters.find((c) => c.slug === "vector-indexes");
if (!TARGET) throw new Error("vector-indexes cluster is gone — the fixtures need rewriting");
const SLUGS = TARGET.entries.map((e) => e.slug);
if (SLUGS.length !== 4) {
  throw new Error(`vector-indexes has ${SLUGS.length} entries, fixtures assume 4 — rewrite the fixtures`);
}

/**
 * A structurally correct primer for that cluster, used as the base every fixture
 * mutates. It has to genuinely PASS, or every rejection below is meaningless —
 * which is what the baseline assertion further down checks.
 */
const good = () => ({
  slug: "vector-indexes",
  primer: {
    whatItIs: {
      en: "A vector index is the data structure that finds the nearest vectors to a query without comparing it against every stored vector one at a time.",
      es: "Un índice vectorial es la estructura de datos que encuentra los vectores más cercanos a una consulta sin compararla contra cada vector almacenado de uno en uno.",
    },
    whyItExists: {
      en: "Comparing a query against every vector is exact and gets slower in a straight line with the collection. At 1 million vectors of 1536 dimensions that is 1.5 billion multiplications for one search, so every index here gives up some correct answers to stop paying it.",
      es: "Comparar una consulta contra cada vector es exacto y se vuelve más lento en línea recta con la colección. Con 1 millón de vectores de 1536 dimensiones son 1.500 millones de multiplicaciones por búsqueda, así que todo índice aquí cede algunas respuestas correctas para dejar de pagarlo.",
    },
    axisOfChoice: {
      en: "Which of the three resources you refuse to spend: the recall you give up, the latency you accept per query, or the memory the index has to hold resident.",
      es: "Cuál de los tres recursos te niegas a gastar: el recall que cedes, la latencia que aceptas por consulta o la memoria que el índice debe mantener residente.",
    },
    /**
     * Four entries and rule 6 (no family of one) leave exactly one legal shape:
     * two families of two. A baseline carrying a family of one would itself be a
     * defect fixture, and every rejection below would then be measured against
     * content the gate is right to reject.
     */
    families: [
      {
        label: { en: "Full-precision in RAM", es: "Precisión completa en RAM" },
        rule: {
          en: "One instance's RAM holds the raw vectors, so every distance you compute is the true one and the only recall you lose is whatever the query chose to skip.",
          es: "La RAM de una sola instancia guarda los vectores crudos, así que toda distancia que calculas es la verdadera y el único recall que pierdes es lo que la consulta decidió saltarse.",
        },
        entries: [SLUGS[0], SLUGS[1]],
      },
      {
        label: { en: "Compressed or disk-backed", es: "Comprimidos o respaldados en disco" },
        rule: {
          en: "Raw float32 no longer fits the memory you are willing to rent, so a query compares compressed codes and reads the true coordinates back only to rescore its top candidates.",
          es: "El float32 crudo ya no entra en la memoria que estás dispuesto a alquilar, así que una consulta compara códigos comprimidos y relee las coordenadas verdaderas solo para reordenar sus mejores candidatos.",
        },
        entries: [SLUGS[2], SLUGS[3]],
      },
    ],
    howToChoose: [
      {
        en: "How many vectors are there, and does a full scan still answer inside your latency budget?",
        es: "¿Cuántos vectores hay, y un escaneo completo todavía responde dentro de tu presupuesto de latencia?",
      },
      {
        en: "What recall does the feature actually need, and have you measured it against an exact scan rather than assumed it?",
        es: "¿Qué recall necesita de verdad la funcionalidad, y lo has medido contra un escaneo exacto en lugar de suponerlo?",
      },
      {
        en: "Does the index fit in the memory you are willing to pay for, or does it have to live on disk?",
        es: "¿El índice entra en la memoria que estás dispuesto a pagar, o tiene que vivir en disco?",
      },
    ],
  },
});

/**
 * Each fixture: [name, mutate(primerFile) -> void, mustFailOn]
 * `mustFailOn` is a substring the validator's output must contain, so the test
 * proves the rejection happened for the RIGHT reason and not incidentally.
 */
const FIXTURES = [
  // ── The defect this whole field exists to fix ──
  ["primer missing entirely (the shipped state, 11 of 11 clusters)",
    (p) => { delete p.primer; }, "not a cluster"],

  // ── Rule 2: the total partition. The load-bearing check. ──
  ["an entry in NO family (absence, one level up)",
    (p) => { p.primer.families.pop(); }, "in no family"],

  // Each of the next three keeps the partition otherwise TOTAL and adds exactly one
  // bad slug to the second family, so the rejection can only be about that slug.
  ["an entry in TWO families (so the partition overlaps)",
    (p) => { p.primer.families[1].entries = [SLUGS[2], SLUGS[3], SLUGS[0]]; }, "already claimed"],

  ["a family naming an entry that does not exist at all",
    (p) => { p.primer.families[1].entries = [SLUGS[2], SLUGS[3], "hnsw-index-that-does-not-exist"]; },
    "not an entry in this cluster"],

  ["a family borrowing a REAL entry from a different cluster",
    // `bm25-lexical-retrieval` is a real Codex entry, in retrieval-ranking. The
    // partition is per-cluster, so borrowing it must be rejected even though the
    // slug resolves globally — a whole-codex existence check would pass this one.
    (p) => { p.primer.families[1].entries = [SLUGS[2], SLUGS[3], "bm25-lexical-retrieval"]; },
    "not an entry in this cluster"],

  // ── Rule 6: a family of one renames the entry instead of grouping it ──
  //
  // Read against the BASELINE above, which partitions the same 4 entries into two
  // families of two and PASSES: the fixture and the baseline together pin the rule
  // to a real boundary rather than to "any families list is fine".
  //
  // The strict form is kept because it costs nothing on real content — all 11
  // authored primers carve 107 entries with zero singleton families, and this very
  // cluster came out as a clean 2×2 along storage fidelity. See the note on the
  // rule in merge-codex.cjs for what to do if it ever becomes unsatisfiable.
  ["a family of one (structure that renames the entry instead of grouping it)",
    (p) => {
      p.primer.families = [
        { label: { en: "Exhaustive", es: "Exhaustivos" }, rule: p.primer.families[0].rule, entries: [SLUGS[0]] },
        { label: { en: "Graph based", es: "Basados en grafo" }, rule: p.primer.families[0].rule, entries: [SLUGS[1]] },
        { label: { en: "Cluster based", es: "Basados en clúster" }, rule: p.primer.families[1].rule, entries: [SLUGS[2]] },
        { label: { en: "Out-of-core", es: "Fuera del núcleo" }, rule: p.primer.families[1].rule, entries: [SLUGS[3]] },
      ];
    }, "a rename, not a grouping"],

  ["only one family (which is not a grouping at all)",
    (p) => {
      p.primer.families = [{
        label: { en: "Vector indexes", es: "Índices vectoriales" },
        rule: p.primer.families[0].rule,
        entries: SLUGS,
      }];
    }, "one family is not a grouping"],

  // ── Rule 3: a figure ──
  ["whyItExists states no number",
    (p) => {
      p.primer.whyItExists = {
        en: "Comparing a query against every stored vector is exact, and it gets steadily slower as the collection grows, so every index in this family gives up some correct answers to avoid paying that cost on every single search.",
        es: "Comparar una consulta contra cada vector almacenado es exacto, y se vuelve cada vez más lento a medida que crece la colección, así que todo índice de esta familia cede algunas respuestas correctas para no pagar ese costo en cada búsqueda.",
      };
    }, "no digit"],

  // ── Rule 4: the axis must be named ──
  ["axisOfChoice gestures at tradeoffs without naming a dimension",
    (p) => {
      p.primer.axisOfChoice = {
        en: "Each option in this family has real tradeoffs, and picking well means understanding them before you commit to one in production.",
        es: "Cada opción de esta familia tiene compensaciones reales, y elegir bien implica entenderlas antes de comprometerte con una en producción.",
      };
    }, "names no dimension"],

  // ── Rule 5: steps are checkable questions ──
  ["a howToChoose step that is not a question",
    (p) => {
      p.primer.howToChoose[1] = {
        en: "Consider the recall requirements of your particular application before selecting an index family.",
        es: "Considera los requisitos de recall de tu aplicación particular antes de seleccionar una familia de índices.",
      };
    }, "not a question"],

  ["howToChoose reduced to one step",
    (p) => { p.primer.howToChoose = [p.primer.howToChoose[0]]; }, "needs 2-5 steps"],

  // ── Primer-specific banned shapes (none of these contains a banned WORD) ──
  ["a table of contents read aloud",
    (p) => {
      p.primer.whatItIs = {
        en: "In this cluster you will learn the four index families, how each one is built, and what each costs you at query time.",
        es: "En este cluster aprenderás las cuatro familias de índices, cómo se construye cada una y qué te cuesta cada una en tiempo de consulta.",
      };
    }, "table of contents"],

  ["\"there are many approaches\" as an opener",
    (p) => {
      p.primer.whatItIs = {
        en: "There are many approaches to indexing vectors, and each of them arranges the stored vectors so that a search can skip most of them.",
        es: "Hay muchos enfoques para indexar vectores, y cada uno organiza los vectores almacenados para que una búsqueda pueda saltarse la mayoría.",
      };
    }, "decides nothing"],

  ["\"it depends\" as a whole step",
    (p) => { p.primer.howToChoose[2] = { en: "It depends.", es: "Depende." }; }, "not a question"],

  // ── Labels are noun phrases ──
  ["a family label written as a sentence",
    (p) => {
      p.primer.families[1].label = {
        en: "You can let the whole index live in memory.",
        es: "Puedes dejar que todo el índice viva en memoria.",
      };
    }, "noun phrase, not a sentence"],

  // ── Word caps ──
  ["whatItIs over the 45-word cap",
    (p) => {
      p.primer.whatItIs = {
        en: "A vector index is the data structure that finds the nearest stored vectors to a given query vector without having to compare that query against every single vector in the entire collection one at a time, which is the thing that makes similarity search usable at a size where a full scan would be far too slow to serve.",
        es: "Un índice vectorial es la estructura de datos que encuentra los vectores almacenados más cercanos a un vector de consulta dado sin tener que comparar esa consulta contra todos y cada uno de los vectores de la colección de uno en uno.",
      };
    }, "cap is 45"],

  // ── Bilinguality, reusing the shared validator ──
  ["Spanish left identical to English",
    (p) => { p.primer.axisOfChoice.es = p.primer.axisOfChoice.en; }, "untranslated"],

  ["the Spanish side missing",
    (p) => { delete p.primer.whyItExists.es; }, "whyItExists"],

  ["a banned calque in the Spanish",
    (p) => {
      p.primer.families[0].rule.es = "La colección es lo bastante pequeña para que un escaneo completo sea más robusto que cualquier aproximación, y quieres una base contra la que medir.";
    }, "calque"],

  // ── The shared writing contract still applies inside a primer ──
  ["a banned word from the writing contract",
    (p) => {
      p.primer.families[1].rule.en = "The whole index fits in RAM, which is crucial when you are buying latency and accept a recall below 100 percent in exchange for not scanning everything.";
    }, "banned word"],

  ["a banned shape from the writing contract",
    (p) => {
      p.primer.families[1].rule.en = "The whole index fits in RAM and serves as the fast path, so you accept a recall below 100 percent in exchange for not scanning all 1 million vectors.";
    }, "banned phrase/shape"],
];

let failures = 0;

/** Merge one primer file against the shipped codex, without writing it. */
const run = (payload) => {
  const f = path.join(tmp, `primer-${Math.abs(JSON.stringify(payload).length)}.json`);
  fs.writeFileSync(f, JSON.stringify(payload, null, 1));
  try {
    const out = execFileSync(process.execPath, [MERGE, "--dry-run", f], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout || ""}${e.stderr || ""}` };
  }
};

// ── 0. BASELINE. A correct primer must merge cleanly, or every rejection below
//       could be an artifact of the fixture rather than of the defect.
console.log("\nbaseline — a correct primer must pass:");
{
  const r = run(good());
  if (r.code !== 0) {
    failures++;
    console.log("  ✗ the known-good primer was REJECTED:");
    console.log(r.out.split("\n").filter((l) => l.includes("✗")).map((l) => `      ${l.trim()}`).join("\n"));
  } else {
    console.log("  ✓ correct primer accepted");
  }
}

// ── 1. Every defect fixture must be REJECTED, for the right reason.
console.log("\ndefect fixtures — each must be rejected:");
for (const [name, mutate, reason] of FIXTURES) {
  const p = good();
  mutate(p);
  const r = run(p);
  if (r.code === 0) {
    failures++;
    console.log(`  ✗ ${name} — MERGED CLEANLY (the gate is blind to this)`);
  } else if (!r.out.includes(reason)) {
    failures++;
    console.log(`  ✗ ${name} — rejected, but not for "${reason}". Got:`);
    console.log(r.out.split("\n").filter((l) => l.includes("✗")).map((l) => `      ${l.trim()}`).join("\n"));
  } else {
    console.log(`  ✓ ${name}`);
  }
}

// ── 2. The false-positive guard. All shipped primers are real correct content,
//       and a gate that fires on correct content trains people to bypass it —
//       so this half of the test is not optional.
console.log("\nfalse-positive guard:");
try {
  execFileSync(process.execPath, [MERGE, "--check"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  console.log(`  ✓ all ${shipped.clusters.length} shipped primers still validate`);
} catch (e) {
  failures++;
  console.log("  ✗ the gate now rejects shipped content:");
  console.log(`${e.stdout || ""}${e.stderr || ""}`.split("\n").filter((l) => l.includes("✗")).map((l) => `      ${l.trim()}`).join("\n"));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures === 0
  ? `\n✓ merge-codex primer self-test passed (${FIXTURES.length} defect classes caught, shipped content clean)`
  : `\n✗ ${failures} self-test failure(s)`);
process.exit(failures === 0 ? 0 : 1);
