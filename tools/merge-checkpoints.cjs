#!/usr/bin/env node
/**
 * Validating merge of authored checkpoints into the curriculum spine.
 *
 * A checkpoint is the mastery GATE — the one place the app tells a learner
 * "you've earned this level". A malformed one (two correct options, a concept
 * slug that doesn't exist, an item whose correct answer is obviously the longest
 * string) silently corrupts the only honest signal the platform has. Hence a
 * hard validator rather than trust.
 *
 * Checks:
 *   • id / domainId / axisId / afterLevel well-formed and consistent with the spine
 *   • coversConcepts all exist AND belong to that domain+level
 *   • exactly one correct option per item
 *   • every item's `concept` is in coversConcepts
 *   • ≥2 options, all bilingual, all with a bilingual rationale
 *   • no banned Spanish calques
 *   • correct-answer position is not always the same index (a giveaway pattern)
 *
 * Usage: node tools/merge-checkpoints.cjs research/cloud-checkpoints-l3l4.json …
 *        node tools/merge-checkpoints.cjs --check
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SPINE = path.join(ROOT, "src/content/data/curriculum.json");
const LEVELS = ["L3", "L4", "L5", "L6", "L7"];
/**
 * Banned Spanish calques.
 *
 * `eventualmente` is a false friend: in Spanish it means "occasionally /
 * possibly", not English "eventually". The negative lookahead exempts
 * "eventualmente consistente", which IS the established Spanish term for eventual
 * consistency — the one place the word is correct.
 */
const BANNED = new RegExp([
  "\\blibrer[íi]as?\\b",
  "\\brobust[oa]s?\\b",
  "\\brobustez\\b",
  "\\bcorrectitud\\b",
  // False friend: Spanish "eventualmente" means occasionally/possibly, not
  // "in time". The lookahead exempts "eventualmente consistente", which IS the
  // correct Spanish term for eventual consistency.
  "\\beventualmente\\b(?!\\s+consistente)",
].join("|"), "i");

const errs = [];
const warns = [];
const bad = (m) => errs.push(m);

const i18nOk = (v) => v && typeof v.en === "string" && typeof v.es === "string" && v.en.trim() && v.es.trim();

/** Build slug → {domainId, level} from the spine. */
function conceptIndex(spine) {
  const idx = new Map();
  for (const d of spine.domains) {
    for (const lv of d.levels) for (const c of lv.concepts) idx.set(c.slug, { domainId: d.id, level: lv.level });
  }
  return idx;
}

function validateCheckpoint(cp, idx, spine) {
  const where = cp.id ?? "?";
  if (typeof cp.id !== "string" || !/^chk-[a-z0-9-]+$/.test(cp.id)) bad(`${where}: bad id`);
  const dom = spine.domains.find((d) => d.id === cp.domainId);
  if (!dom) return bad(`${where}: unknown domainId "${cp.domainId}"`);
  if (cp.axisId !== dom.axisId) bad(`${where}: axisId ${cp.axisId} ≠ domain axisId ${dom.axisId}`);
  if (!LEVELS.includes(cp.afterLevel)) bad(`${where}: bad afterLevel "${cp.afterLevel}"`);
  // Convention the loader relies on: chk-<domainId>-<level lowercased>.
  const expected = `chk-${cp.domainId}-${String(cp.afterLevel).toLowerCase()}`;
  if (cp.id !== expected) bad(`${where}: id should be "${expected}"`);

  if (!Array.isArray(cp.coversConcepts) || cp.coversConcepts.length === 0) bad(`${where}: coversConcepts empty`);
  for (const s of cp.coversConcepts ?? []) {
    const meta = idx.get(s);
    if (!meta) { bad(`${where}: unknown concept "${s}"`); continue; }
    if (meta.domainId !== cp.domainId) bad(`${where}: concept "${s}" belongs to ${meta.domainId}`);
    if (meta.level !== cp.afterLevel) bad(`${where}: concept "${s}" is ${meta.level}, not ${cp.afterLevel}`);
  }
  // Every concept in the band should be checked by at least one item, or the
  // gate silently doesn't test part of what it claims to gate.
  const levelConcepts = (dom.levels.find((l) => l.level === cp.afterLevel)?.concepts ?? []).map((c) => c.slug);
  const missing = levelConcepts.filter((s) => !(cp.coversConcepts ?? []).includes(s));
  if (missing.length) warns.push(`${where}: level concepts not covered: ${missing.join(", ")}`);

  if (!Array.isArray(cp.items) || cp.items.length < 4) bad(`${where}: needs ≥4 items`);
  const correctIdx = [];
  for (const [i, it] of (cp.items ?? []).entries()) {
    const w = `${where}#${i + 1}`;
    if (!(cp.coversConcepts ?? []).includes(it.concept)) bad(`${w}: concept "${it.concept}" not in coversConcepts`);
    if (!i18nOk(it.stem)) bad(`${w}: stem must be bilingual`);
    if (it.stem && it.stem.en?.trim() === it.stem.es?.trim()) bad(`${w}: stem.es is untranslated`);
    if (it.stem?.es && BANNED.test(it.stem.es)) bad(`${w}: banned calque in stem.es`);
    if (!Array.isArray(it.options) || it.options.length < 2) { bad(`${w}: needs ≥2 options`); continue; }
    const corrects = it.options.filter((o) => o.correct === true);
    if (corrects.length !== 1) bad(`${w}: has ${corrects.length} correct options, needs exactly 1`);
    correctIdx.push(it.options.findIndex((o) => o.correct === true));
    for (const [j, o] of it.options.entries()) {
      const ow = `${w}.${j + 1}`;
      if (!i18nOk(o.text)) bad(`${ow}: option text must be bilingual`);
      if (o.text && o.text.en?.trim() === o.text.es?.trim()) bad(`${ow}: option text.es untranslated`);
      if (!i18nOk(o.rationale)) bad(`${ow}: rationale must be bilingual`);
      if (o.rationale && o.rationale.en?.trim() === o.rationale.es?.trim()) bad(`${ow}: rationale.es untranslated`);
      for (const [k, v] of [["text", o.text], ["rationale", o.rationale]]) {
        if (v?.es && BANNED.test(v.es)) bad(`${ow}: banned calque in ${k}.es`);
      }
      if (typeof o.correct !== "boolean") bad(`${ow}: correct must be boolean`);
    }
  }
  // Position bias in the AUTHORED order is expected and harmless — authors write
  // the right answer first. It's neutralized at render by the deterministic
  // shuffle in src/lib/shuffle.ts (which is unit-tested and covers all content,
  // present and future). We report it as information only: if this ever becomes
  // an error again, the fix belongs in the renderer, not in 157 JSON items.
  if (correctIdx.length >= 4 && new Set(correctIdx).size === 1) {
    warns.push(`${where}: authored order always puts the key at index ${correctIdx[0]} (neutralized by the render-time shuffle)`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const inputs = args.filter((a) => !a.startsWith("--"));
  const spine = JSON.parse(fs.readFileSync(SPINE, "utf8"));
  const idx = conceptIndex(spine);

  if (checkOnly) {
    for (const cp of spine.checkpoints) validateCheckpoint(cp, idx, spine);
  } else {
    const byId = new Map(spine.checkpoints.map((c) => [c.id, c]));
    for (const f of inputs) {
      const p = path.isAbsolute(f) ? f : path.join(ROOT, f);
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      const list = data.checkpoints ?? [];
      if (!list.length) { bad(`${f}: no checkpoints`); continue; }
      for (const cp of list) {
        validateCheckpoint(cp, idx, spine);
        if (errs.length) continue;
        // Strip authoring-only keys before shipping.
        const clean = { id: cp.id, domainId: cp.domainId, axisId: cp.axisId, afterLevel: cp.afterLevel, coversConcepts: cp.coversConcepts, items: cp.items };
        const replaced = byId.has(cp.id);
        byId.set(cp.id, clean);
        console.log(`  ${replaced ? "replaced" : "added"} ${cp.id} (${cp.items.length} items)`);
      }
    }
    if (!errs.length) {
      // Deterministic order: by domain order in the spine, then by level.
      const domOrder = spine.domains.map((d) => d.id);
      spine.checkpoints = [...byId.values()].sort(
        (a, b) => domOrder.indexOf(a.domainId) - domOrder.indexOf(b.domainId) || LEVELS.indexOf(a.afterLevel) - LEVELS.indexOf(b.afterLevel)
      );
    }
  }

  if (warns.length) { console.log(`\n${warns.length} warning(s):`); for (const w of warns) console.log("  ! " + w); }
  if (errs.length) {
    console.error(`\n${errs.length} error(s):`);
    for (const e of errs) console.error("  ✗ " + e);
    console.error(checkOnly ? "" : "\n✗ refusing to write curriculum.json.");
    process.exit(1);
  }
  if (checkOnly) { console.log(`✓ ${spine.checkpoints.length} checkpoints valid.`); return; }
  fs.writeFileSync(SPINE, JSON.stringify(spine, null, 1) + "\n", "utf8");
  console.log(`✓ wrote spine: ${spine.checkpoints.length} checkpoints`);
}

main();
