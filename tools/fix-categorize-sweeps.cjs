#!/usr/bin/env node
/**
 * Reorder authored categorize items to minimise what a BLIND strategy can clear.
 *
 * THE EXPLOIT THE DISPLAY SHUFFLE CANNOT TOUCH
 * `checkDisplay.ts` shuffles the tray, and the strategies that beat categorize do not read
 * the tray at all. "Put the first n/b items in bucket 0, the next n/b in bucket 1" wins
 * whenever the AUTHORED key is a neat run, whatever order the items are displayed in. 63 of
 * 105 checks were in that shape, so the exploit cleared 60% of them outright — and grading
 * is all-or-nothing, so a clear is a clear.
 *
 * WHY THE OBVIOUS FIX IS WORSE
 * My first version interleaved: one item per bucket in turn, [0,0,0,1,1] -> [0,1,0,1,0].
 * That drove the sweep to 0 of 105 and looked like a complete fix. Measured, it was a
 * REGRESSION: interleaving IS the alternating pattern, so `i % b` went from clearing 12.4%
 * to clearing 72.4%. Eliminating one blind strategy by adopting another is not a fix, and
 * the sweep count alone would never have shown it — only measuring every strategy did.
 *
 * WHAT THIS DOES INSTEAD
 * For each check, enumerate the arrangements of its items and pick the one that minimises
 * the MAXIMUM clear across every blind strategy — sweep, reverse sweep, alternating,
 * all-one-bucket, and the reverse of each. Ties break toward the arrangement closest to the
 * authored order, so the reading flow changes as little as possible.
 *
 * Deterministic: no `Math.random()`, so the corpus stays reproducible. Only the ORDER of
 * `items` changes; every label, bucket, prompt and explanation is byte-identical, so no
 * content needs re-reviewing.
 *
 * Usage: node tools/fix-categorize-sweeps.cjs [--dry-run]
 */
const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(__dirname, "..", "src", "content", "data", "checks.json");
const dry = process.argv.includes("--dry-run");

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
const checks = data.checks ?? data;

const nB = (c) => c.buckets.length;

/**
 * Every blind strategy a learner can run without reading the tray.
 *
 * Each returns the bucket it would assign to display position i. A strategy clears the
 * check when its whole vector matches the authored key, because grading is boolean.
 */
function blindGuesses(items, buckets) {
  const b = buckets.length;
  const n = items.length;
  const out = [];
  out.push(items.map((_, i) => Math.min(b - 1, Math.floor((i * b) / n))));          // even sweep
  out.push(items.map((_, i) => b - 1 - Math.min(b - 1, Math.floor((i * b) / n))));  // reverse sweep
  for (let off = 0; off < b; off++) out.push(items.map((_, i) => (i + off) % b));   // alternating, any phase
  for (let k = 0; k < b; k++) out.push(items.map(() => k));                         // all in one bucket
  return out;
}

/** Does any blind strategy clear this arrangement outright? */
function clearedByBlind(arrangement, buckets) {
  const key = arrangement.map((x) => x.bucket);
  return blindGuesses(arrangement, buckets).some((g) => g.every((v, i) => v === key[i]));
}

/**
 * Candidate orderings, cheapest first.
 *
 * Full permutation is factorial, so this walks a bounded set: every rotation of the
 * authored order, then every adjacent swap, then rotations of the interleave. That is
 * enough to escape a run in practice while staying deterministic and fast, and the result
 * is verified rather than assumed — anything that cannot escape is REPORTED, not hidden.
 */
function candidates(items, buckets) {
  const out = [items.slice()];
  const n = items.length;
  for (let r = 1; r < n; r++) out.push([...items.slice(r), ...items.slice(0, r)]);
  for (let i = 0; i < n - 1; i++) {
    const swapped = items.slice();
    [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
    out.push(swapped);
  }
  // Interleave and its rotations — sometimes the only escape for a 2-bucket check, and
  // safe here because the scorer rejects it when it lands on `alternating`.
  const lanes = buckets.map((_, b) => items.filter((x) => x.bucket === b));
  const woven = [];
  let placed = 0;
  const copy = lanes.map((l) => l.slice());
  while (placed < n) {
    for (const lane of copy) { const x = lane.shift(); if (x) { woven.push(x); placed++; } }
  }
  for (let r = 0; r < n; r++) out.push([...woven.slice(r), ...woven.slice(0, r)]);
  return out;
}

/** How far an arrangement is from the authored order — the tie-break. */
const drift = (arrangement, original) =>
  arrangement.reduce((a, x, i) => a + Math.abs(original.indexOf(x) - i), 0);

let fixed = 0;
const unfixable = [];
for (const c of checks) {
  if (c.kind !== "categorize") continue;
  if (!clearedByBlind(c.items, c.buckets)) continue;

  const original = c.items.slice();
  const safe = candidates(original, c.buckets).filter((a) => !clearedByBlind(a, c.buckets));
  if (!safe.length) {
    // A 2-item, 2-bucket check is [0,1] or [1,0] and both ARE blind patterns. Reporting it
    // is the honest outcome; the content fix is a third item, not a reorder.
    unfixable.push(`${c.id} (${original.length} items, ${nB(c)} buckets)`);
    continue;
  }
  safe.sort((a, b) => drift(a, original) - drift(b, original));
  c.items = safe[0];
  fixed++;
}

console.log(`${fixed} categorize check(s) reordered out of every blind pattern`);
if (unfixable.length) {
  console.log(`\n${unfixable.length} cannot escape by reordering — they need another item:`);
  for (const u of unfixable) console.log(`  ${u}`);
}

// Report the residual exposure across EVERY strategy, because the count of one pattern is
// what made the first version of this tool look like a success.
const cat = checks.filter((c) => c.kind === "categorize");
const still = cat.filter((c) => clearedByBlind(c.items, c.buckets)).length;
console.log(`\nblind-clearable: ${still} of ${cat.length} (${((still / cat.length) * 100).toFixed(1)}%)`);

if (dry) { console.log("\n(dry run — nothing written)"); process.exit(0); }
fs.writeFileSync(FILE, JSON.stringify(data));
console.log("wrote checks.json");
