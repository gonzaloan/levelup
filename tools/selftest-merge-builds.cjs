#!/usr/bin/env node
/**
 * Does merge-builds.cjs catch the defects it was written for?
 *
 * The project rule: a gate is not trusted until it has been measured against the defects it
 * exists for. This file was missing, and the adversarial review noted that the three `decoy`
 * rules held only because someone had exercised them by hand once — nothing in the suite or
 * in `content:check` would have noticed them breaking.
 *
 * Each case mutates an in-memory copy of the shipped corpus and asserts `checkChallenge`
 * reports the right thing. No file on disk is touched, which is why this is safe to run in
 * `verify` alongside the other self-tests.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const BUILDS = path.join(ROOT, "src/content/data/builds.json");
const SPINE = path.join(ROOT, "src/content/data/curriculum.json");

const shipped = JSON.parse(fs.readFileSync(BUILDS, "utf8"));
const spine = JSON.parse(fs.readFileSync(SPINE, "utf8"));
const spineSlugs = new Set(
  spine.domains.flatMap((d) => d.levels.flatMap((l) => l.concepts.map((c) => c.slug))),
);

/**
 * Run the validator over one challenge in isolation.
 *
 * merge-builds.cjs accumulates into module-level `errs`/`warns` arrays, so the module is
 * re-required per case with the cache cleared — otherwise findings leak between cases and a
 * later case "passes" on an earlier case's error.
 */
function validate(challenge) {
  const modPath = require.resolve("./merge-builds.cjs");
  delete require.cache[modPath];
  const mod = require("./merge-builds.cjs");
  // The arrays are not exported, so read them back off the module's own closure via a fresh
  // require and a throwaway call. `checkChallenge` is exported precisely for this.
  const errsBefore = [];
  const warnsBefore = [];
  const captured = { errs: errsBefore, warns: warnsBefore };
  // checkChallenge pushes into the module's arrays; capture by monkey-patching console is
  // fragile, so instead re-derive: run it and inspect the exported arrays if present.
  mod.checkChallenge(challenge, challenge.id ?? "(no id)", spineSlugs, new Set());
  return { errs: mod.errs ?? captured.errs, warns: mod.warns ?? captured.warns };
}

const clone = (id) => JSON.parse(JSON.stringify((shipped.builds ?? shipped).find((b) => b.id === id)));

let pass = 0;
const failures = [];

/** The mutation must produce an ERROR whose message contains `expect`. */
function rejects(name, id, mutate, expect) {
  const c = clone(id);
  mutate(c);
  const { errs } = validate(c);
  if (!errs.length) failures.push(`${name}: accepted a broken challenge`);
  else if (expect && !errs.some((e) => e.includes(expect))) {
    failures.push(`${name}: rejected for the wrong reason — wanted "${expect}", got "${errs[0]}"`);
  } else pass++;
}

/** The mutation must produce a WARNING containing `expect`, and no error. */
function warnsAbout(name, id, mutate, expect) {
  const c = clone(id);
  mutate(c);
  const { errs, warns } = validate(c);
  if (errs.length) failures.push(`${name}: errored when it should only warn — ${errs[0]}`);
  else if (!warns.some((w) => w.includes(expect))) {
    failures.push(`${name}: no warning containing "${expect}" (warns: ${warns.join(" | ") || "none"})`);
  } else pass++;
}

/** Correct content must be accepted with no error. */
function accepts(name, id, mutate = () => {}) {
  const c = clone(id);
  mutate(c);
  const { errs } = validate(c);
  if (errs.length) failures.push(`${name}: rejected valid content — ${errs[0]}`);
  else pass++;
}

// ── the decoy rules, which had no coverage at all ─────────────────────────
rejects(
  "a decoy with no hint", "build-agent-tool-guardrail",
  (c) => { const p = c.palette.find((x) => x.type === "sysprompt"); p.decoy = true; delete p.hint; },
  "needs a hint",
);
rejects(
  "a decoy that a criterion requires", "build-rag-system",
  (c) => { c.palette.find((x) => x.type === "llm").decoy = true; },
  "marked decoy but a criterion requires it",
);
warnsAbout(
  "an orphan palette type nobody declared", "build-agent-tool-guardrail",
  (c) => { delete c.palette.find((x) => x.type === "sysprompt").decoy; },
  "appears in no criterion",
);
accepts("a declared decoy with a hint", "build-agent-tool-guardrail");

// ── the unsatisfiable-criterion rules ────────────────────────────────────
rejects(
  "a required node the palette does not offer", "build-rag-system",
  (c) => { c.requiredNodes[0].type = "NOT_IN_PALETTE"; },
  "is not in the palette",
);
rejects(
  "a required edge naming a type the palette lacks", "build-rag-system",
  (c) => { c.requiredEdges[0].from = "NOPE"; },
  "is not in the palette",
);
rejects(
  "a forbidden edge that is also required", "build-rag-system",
  (c) => { c.forbiddenEdges.push({ ...c.requiredEdges[0] }); },
  "is also required",
);
rejects(
  "a self-edge", "build-rag-system",
  (c) => { c.requiredEdges[0].to = c.requiredEdges[0].from; },
  "self-edge",
);

// ── translation, the check a single character used to defeat ──────────────
rejects(
  "es = en with a period appended", "build-rag-system",
  (c) => { c.prompt.es = `${c.prompt.en}.`; },
  "reads as English",
);
rejects(
  "es = en verbatim", "build-rag-system",
  (c) => { c.prompt.es = c.prompt.en; },
  "identical in both languages",
);
rejects(
  "an empty Spanish field", "build-rag-system",
  (c) => { c.explain.es = "   "; },
  "empty",
);

// ── identity and terminology ─────────────────────────────────────────────
rejects(
  "a concept the spine does not have", "build-rag-system",
  (c) => { c.concept = "not-a-real-concept"; },
  "is not a spine concept",
);
rejects(
  "a banned rendering in the Spanish", "build-rag-system",
  (c) => { c.prompt.es = `${c.prompt.es} Usa una incrustación por chunk y revisa el resultado.`; },
  "banned for embedding",
);

// ── correct content must be accepted ─────────────────────────────────────
for (const b of shipped.builds ?? shipped) {
  accepts(`the shipped challenge ${b.id}`, b.id);
}

const total = pass + failures.length;
for (const f of failures) console.error(`FAIL  ${f}`);
console.log(`\nselftest-merge-builds: ${pass}/${total} checks pass`);
if (failures.length) process.exit(1);
