#!/usr/bin/env node
/**
 * Spanish repairs from the content reviewer's FAIL (2026-07-25).
 *
 * Each entry is an exact-string replacement so the edit is auditable and
 * idempotent: re-running finds nothing and exits clean. `expect` guards against
 * a silent no-op if the source text ever changes.
 *
 * Why these: `eventualmente` in Spanish means "occasionally / possibly", not
 * "in time" — it is a false friend for English "eventually". The others are a
 * transposed English construction, a gender-agreement slip, and an awkward
 * "por que" that reads as a `porque` typo.
 */
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");

const FIXES = [
  // ── `eventualmente` (false friend) ──────────────────────────────────────
  { file: "src/content/data/curriculum.json",
    from: "así que el dato llega a disco eventualmente.",
    to:   "así que el dato llega a disco con el tiempo." },
  { file: "src/content/data/curriculum.json",
    from: "no hay nada que reproducir en la recuperación: ese 'eventualmente' nunca ocurre.",
    to:   "no hay nada que reproducir en la recuperación: ese 'con el tiempo' nunca llega." },
  { file: "src/content/data/curriculum.json",
    from: "sin backoff para que los requests eventualmente pasen cuando se libere capacidad.",
    to:   "sin backoff para que los requests pasen tarde o temprano cuando se libere capacidad." },
  { file: "src/content/data/curriculum.json",
    from: "un trabajo que eventualmente excede un límite de ejecución falla",
    to:   "un trabajo que tarde o temprano excede un límite de ejecución falla" },
  { file: "src/content/data/curriculum.json",
    from: "porque una denegación dura eventualmente bloqueará un caso legítimo",
    to:   "porque una denegación dura tarde o temprano bloqueará un caso legítimo" },
  { file: "src/content/data/lessons.json",
    from: "más baratos que los incidentes que eventualmente expondrían los mismos defectos",
    to:   "más baratos que los incidentes que tarde o temprano expondrían los mismos defectos" },
  // These two are the CORRECT technical sense ("eventualmente consistente" is
  // the established Spanish term for eventual consistency) — left untouched on
  // purpose, recorded here so a future pass doesn't "fix" them:
  //   "una escritura eventualmente consistente"
  //   "marcarlo como 'eventualmente consistente'"

  // ── transposed English syntax ───────────────────────────────────────────
  { file: "src/content/data/lessons.json",
    from: "y ese encuadre es por qué nunca se resuelven",
    to:   "y por ese encuadre nunca se resuelven" },

  // ── gender agreement ───────────────────────────────────────────────────
  { file: "src/content/data/lessons.json",
    from: "la única pregunta serio es si puedes nombrar ambos números",
    to:   "la única pregunta seria es si puedes nombrar ambos números" },

  // ── awkward "por que" that reads as a typo ─────────────────────────────
  { file: "src/content/data/lessons.json",
    from: "Un recargo por instancia por que el proveedor opere una flota dentro de tu cuenta.",
    to:   "Un recargo por instancia que cobra el proveedor por operar una flota dentro de tu cuenta." },
];

let applied = 0, missing = 0;
const byFile = new Map();
for (const f of FIXES) {
  if (!byFile.has(f.file)) byFile.set(f.file, fs.readFileSync(path.join(ROOT, f.file), "utf8"));
  let s = byFile.get(f.file);
  if (!s.includes(f.from)) {
    // Already applied, or the source changed — say which, don't guess.
    const already = s.includes(f.to);
    console.log(`  ${already ? "·" : "✗"} ${already ? "already applied" : "NOT FOUND"}: ${f.from.slice(0, 60)}…`);
    if (!already) missing++;
    continue;
  }
  const n = s.split(f.from).length - 1;
  byFile.set(f.file, s.split(f.from).join(f.to));
  applied += n;
  console.log(`  ✓ ${n}× ${f.from.slice(0, 60)}…`);
}
for (const [file, content] of byFile) fs.writeFileSync(path.join(ROOT, file), content, "utf8");

console.log(`\n${applied} replacement(s) applied${missing ? `, ${missing} not found` : ""}.`);
process.exit(missing ? 1 : 0);
