#!/usr/bin/env node
/**
 * tools/check-coverage.cjs — every domain must be covered by every mechanic.
 *
 * WHY THIS EXISTS
 * The audit found that `cloud-platform`, the 7th domain, has 0 of the 290
 * authored checks while the other six have 40 to 56 each. All 26 of its concepts
 * therefore ship with no graded decision at all.
 *
 * No existing validator could see it. `merge-lessons.cjs` validates lesson shape,
 * `merge-checkpoints.cjs` validates checkpoint shape, `check-prose.cjs` validates
 * prose — each checks that what EXISTS is well-formed. None asked whether
 * something that should exist is MISSING. A domain with zero checks is perfectly
 * well-formed.
 *
 * This is the sixth defect caused by adding a 7th domain to code that assumed
 * six. The project rule is "derive counts and maps from the spine, never hardcode
 * them"; this script is that rule applied to coverage.
 *
 *   node tools/check-coverage.cjs           # fail on any gap
 *   node tools/check-coverage.cjs --report  # print the matrix, exit 0
 *
 * Baseline: tools/coverage-baseline.json records gaps that are KNOWN and accepted,
 * the same ratchet shape as check-prose / check-trace. A gap not in the baseline
 * fails the build. Do NOT add a line to make a build pass.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "src", "content", "data");
const BASELINE = path.join(__dirname, "coverage-baseline.json");
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

const curriculum = read("curriculum.json");
const lessons = read("lessons.json").lessons;
const checks = read("checks.json").checks;
const builds = read("builds.json").builds;
const codex = read("codex.json");

// Derive the domain list from the spine. Never a literal.
const domains = curriculum.domains.map((d) => d.id);
const conceptDomain = new Map();
const conceptLevel = new Map();
for (const d of curriculum.domains) {
  for (const lv of d.levels) {
    for (const c of lv.concepts) {
      conceptDomain.set(c.slug, d.id);
      conceptLevel.set(c.slug, lv.level);
    }
  }
}
const levels = [...new Set([...conceptLevel.values()])].sort();

const lessonConcept = new Map();
for (const l of lessons) for (const c of l.concepts) lessonConcept.set(c.slug, c);

/** count(domain) for a predicate over concept slugs */
const perDomain = (pred) => {
  const out = Object.fromEntries(domains.map((d) => [d, 0]));
  for (const [slug, dom] of conceptDomain) if (pred(slug)) out[dom]++;
  return out;
};

const checkedSlugs = new Set(checks.map((c) => c.concept));
const buildSlugs = new Set(builds.map((b) => b.concept));
const codexLinked = new Set();
for (const cl of codex.clusters) for (const e of cl.entries) for (const r of e.relatedConcepts || []) codexLinked.add(r);
const checkpointCovered = new Set();
for (const cp of curriculum.checkpoints) for (const s of cp.coversConcepts) checkpointCovered.add(s);

const totals = perDomain(() => true);

// ── The mechanics every domain owes its learners ─────────────────────────────
// `min` is the floor per domain. A floor of 1 means "at least somewhere in this
// domain"; `perConcept: true` means every single concept must have it.
const MECHANICS = [
  { id: "lesson", label: "lesson pane", perConcept: true, has: (s) => lessonConcept.has(s) },
  { id: "check", label: "graded/formative check", perConcept: true, has: (s) => checkedSlugs.has(s) },
  { id: "checkpoint", label: "checkpoint coverage", perConcept: true, has: (s) => checkpointCovered.has(s) },
  { id: "diagram", label: "diagram or widget", perConcept: true, has: (s) => {
    const c = lessonConcept.get(s);
    return !!(c && ((c.diagram && c.diagram.kind !== "none") || c.visual));
  } },
  { id: "widget", label: "interactive widget", min: 1, has: (s) => !!lessonConcept.get(s)?.visual },
  { id: "build", label: "Build Lab challenge", min: 1, has: (s) => buildSlugs.has(s) },
  { id: "codex", label: "Codex cross-link", min: 1, has: (s) => codexLinked.has(s) },
];

const matrix = {};
const gaps = [];
for (const m of MECHANICS) {
  const counts = perDomain(m.has);
  matrix[m.id] = counts;
  for (const d of domains) {
    if (m.perConcept) {
      const missing = totals[d] - counts[d];
      if (missing > 0) {
        gaps.push({
          mechanic: m.id, domain: d, kind: "per-concept",
          detail: `${missing} of ${totals[d]} concepts have no ${m.label}`,
          missing,
          concepts: [...conceptDomain].filter(([s, dd]) => dd === d && !m.has(s)).map(([s]) => s),
        });
      }
    } else if (counts[d] < (m.min ?? 1)) {
      gaps.push({
        mechanic: m.id, domain: d, kind: "floor",
        detail: `${counts[d]} ${m.label}(s), floor is ${m.min ?? 1}`,
        missing: (m.min ?? 1) - counts[d], concepts: [],
      });
    }
  }
}

// Also: every domain x level band that has concepts must have a checkpoint.
const bandsWithConcepts = new Set();
for (const [slug, d] of conceptDomain) bandsWithConcepts.add(`${d}|${conceptLevel.get(slug)}`);
const bandsWithCheckpoint = new Set(curriculum.checkpoints.map((c) => `${c.domainId}|${c.afterLevel}`));
for (const b of bandsWithConcepts) {
  if (!bandsWithCheckpoint.has(b)) {
    const [d, lv] = b.split("|");
    gaps.push({ mechanic: "checkpoint-band", domain: d, kind: "band", detail: `${lv} has concepts but no checkpoint`, missing: 1, concepts: [] });
  }
}

const key = (g) => `${g.mechanic}:${g.domain}${g.kind === "band" ? `:${g.detail}` : ""}`;
const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : { accepted: {} };

if (process.argv.includes("--baseline")) {
  const accepted = {};
  for (const g of gaps) accepted[key(g)] = { missing: g.missing, detail: g.detail, note: "TODO: record why this is accepted" };
  fs.writeFileSync(BASELINE, JSON.stringify({ accepted }, null, 1));
  console.log(`wrote ${Object.keys(accepted).length} baselined gap(s) to tools/coverage-baseline.json`);
  process.exit(0);
}

// ── Report ───────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);
const W = Math.max(...domains.map((d) => d.length)) + 2;
console.log(`\ncoverage matrix (${domains.length} domains derived from the spine, ${conceptDomain.size} concepts)\n`);
console.log(pad("domain", W) + pad("n", 5) + MECHANICS.map((m) => pad(m.id, 12)).join(""));
for (const d of domains) {
  console.log(pad(d, W) + pad(totals[d], 5) + MECHANICS.map((m) => {
    const c = matrix[m.id][d];
    const bad = m.perConcept ? c < totals[d] : c < (m.min ?? 1);
    return pad(`${c}${bad ? " !" : ""}`, 12);
  }).join(""));
}

const newGaps = gaps.filter((g) => {
  const b = baseline.accepted[key(g)];
  return !b || g.missing > b.missing;
});
const knownGaps = gaps.filter((g) => baseline.accepted[key(g)]);

console.log("");
if (knownGaps.length) {
  console.log(`${knownGaps.length} known gap(s), baselined in tools/coverage-baseline.json:`);
  for (const g of knownGaps) console.log(`  · ${g.domain} — ${g.detail}`);
}
if (newGaps.length) {
  console.log(`\n✗ ${newGaps.length} coverage gap(s) not in the baseline:\n`);
  for (const g of newGaps) {
    console.log(`  ${g.domain} — ${g.detail}`);
    if (g.concepts.length) {
      console.log(`    ${g.concepts.slice(0, 8).join(", ")}${g.concepts.length > 8 ? `, +${g.concepts.length - 8} more` : ""}`);
    }
  }
  console.log("\nEvery domain owes its learners the same mechanics. Author the missing");
  console.log("content, or baseline the gap WITH a reason via --baseline.");
  if (!process.argv.includes("--report")) process.exit(1);
} else {
  console.log("✓ no new coverage gap");
}
