#!/usr/bin/env node
/**
 * tools/merge-checks.cjs — merge authored check batches into checks.json.
 *
 * Fleet output NEVER goes into a shipped data file unedited. This script is the
 * gate: it validates every field, every index and every language, and refuses the
 * whole batch on a structural error rather than shipping a check that renders
 * broken or grades wrongly.
 *
 * Two classes of bug this exists to stop, both of which have happened here:
 *   1. Agents nest i18n at the wrong level — `{en:{term,def}}` instead of
 *      `{term:{en,es}}` — which type-checks as `unknown` and renders blank.
 *   2. An out-of-range index in `answers` / `pairs` / `bucket` makes a check
 *      ungradeable or silently marks a correct answer wrong.
 *
 *   node tools/merge-checks.cjs research/cp-out/*.json     # merge
 *   node tools/merge-checks.cjs --check                    # validate what ships
 *   node tools/merge-checks.cjs --dry research/cp-out/*.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "src", "content", "data");
const CHECKS = path.join(DATA, "checks.json");

const curriculum = JSON.parse(fs.readFileSync(path.join(DATA, "curriculum.json"), "utf8"));
const SPINE = new Set();
/** slug -> the domain that owns it, so a transfer target can be checked. */
const DOMAIN_OF = new Map();
/**
 * slug -> the set of OTHER domains it has an authored cross-domain relationship with,
 * in either direction.
 *
 * This is what keeps `transferTo` honest. A transfer item is the same judgment applied
 * in a second, unlike context — and the corpus already records which contexts are
 * genuinely related, as `leansOn` edges. Without this check the field would degrade into
 * a free-text label meaning "this one feels cross-domain", which is exactly how a
 * coverage number stops describing anything.
 */
const RELATED_DOMAINS = new Map();
for (const d of curriculum.domains) {
  for (const lv of d.levels) {
    for (const c of lv.concepts) { SPINE.add(c.slug); DOMAIN_OF.set(c.slug, d.id); }
  }
}
for (const d of curriculum.domains) {
  for (const lv of d.levels) {
    for (const c of lv.concepts) {
      for (const lean of c.leansOn ?? []) {
        const target = DOMAIN_OF.get(lean);
        if (!target || target === d.id) continue;
        if (!RELATED_DOMAINS.has(c.slug)) RELATED_DOMAINS.set(c.slug, new Set());
        RELATED_DOMAINS.get(c.slug).add(target);
        // …and the reverse: a foundation is related to every domain that leans on it,
        // which is the direction these six transfer items actually run.
        if (!RELATED_DOMAINS.has(lean)) RELATED_DOMAINS.set(lean, new Set());
        RELATED_DOMAINS.get(lean).add(d.id);
      }
    }
  }
}
const DOMAIN_IDS = new Set(curriculum.domains.map((d) => d.id));

const KINDS = new Set(["cloze", "order", "match", "categorize"]);
const TRACKS = new Set(["general", "ai"]);

// Calques and false friends this project has shipped and fixed before. A merge
// that lets them back in undoes real editorial work.
const ES_FORBIDDEN = [
  [/\brobust[oa]s?\b/i, 'use "confiable" / "resistente", not "robusto"'],
  [/\brobustez\b/i, 'use "fiabilidad", not "robustez"'],
  [/\bcorrectitud\b/i, 'use "corrección", not "correctitud"'],
  [/\blibrer[íi]as?\b/i, 'use "biblioteca", not "librería"'],
  [/\bencriptar\b/i, 'use "cifrar", not "encriptar"'],
];
const EN_FUNCTION = /\b(the|and|with|which|from|that|this|these|those|when|what|your|you|for|are|is|was|were|will|would|should|could|not|but|than|then|because|so|it|its|they|their|there|have|has|had|been|being|of|to|in|on|at|by|as|an|a)\b/gi;
const ES_FUNCTION = /\b(que|de|la|el|los|las|un|una|con|para|por|se|su|sus|es|son|no|si|como|del|al|en|y|o|lo|le|más|pero|cuando|donde|esta|este|esa|ese|hay|ya|sin|sobre)\b/gi;
const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

/**
 * Match checks that ship with no spare right-hand entry.
 *
 * A ratchet, in the same shape as tools/prose-baseline.txt and
 * tools/trace-baseline.txt: an id on this list warns, an id NOT on it fails. The
 * list can only shrink. Do NOT add a line to make a merge pass — author the spare
 * entry, which is one plausible distractor.
 */
const SPARE_BASELINE = path.join(__dirname, "match-spare-baseline.txt");
const BASELINED_NO_SPARE = new Set(
  fs.existsSync(SPARE_BASELINE)
    ? fs.readFileSync(SPARE_BASELINE, "utf8").split("\n")
        .map((l) => l.replace(/#.*$/, "").trim()).filter(Boolean)
    : []
);

const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

/**
 * Validate an I18nText: both languages present and really bilingual.
 *
 * `allowEmpty` exists for cloze `segments`, where an empty string is CORRECT
 * content, not a defect: a sentence that opens with a blank has an empty leading
 * segment. The first version of this rule rejected non-empty-only and fired on
 * three shipped checks whose sentences legitimately start with the blank
 * ("[Deploy] means the code is running in production"). A gate that fires on
 * correct content trains people to bypass the gate, so the RULE was fixed.
 */
function i18n(id, field, v, allowEmpty = false) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return err(id, `${field} is not an {en,es} object`);
  for (const k of ["en", "es"]) {
    if (typeof v[k] !== "string") return err(id, `${field}.${k} is not a string`);
    if (!allowEmpty && !v[k].trim()) return err(id, `${field}.${k} is empty`);
  }
  // Even when empty is allowed, the two languages must AGREE about emptiness —
  // an empty `en` beside a non-empty `es` means one side lost a word.
  if (allowEmpty && !v.en.trim() !== !v.es.trim()) {
    warn(id, `${field}: one language is empty and the other is not`);
  }
  if (v.en.trim() === v.es.trim() && words(v.en) >= 6) {
    warn(id, `${field}: es is identical to en (${words(v.en)} words) — untranslated?`);
  }
  for (const [re, why] of ES_FORBIDDEN) if (re.test(v.es)) err(id, `${field}.es calque — ${why}`);
  if (/\beventualmente\b/i.test(v.es) && !/eventualmente consistente/i.test(v.es)) {
    err(id, `${field}.es uses "eventualmente" as a false friend for "finally"`);
  }
  // Reuse the inventory's measured separator: Spanish must not read as English.
  if (words(v.es) >= 12) {
    const en = (v.es.match(EN_FUNCTION) || []).length / words(v.es);
    const es = (v.es.match(ES_FUNCTION) || []).length / words(v.es);
    if (en - es > 0.02) err(id, `${field}.es reads as English (skew ${(en - es).toFixed(3)}) — not translated`);
  }
  return undefined;
}
const i18nArray = (id, field, arr, min, allowEmpty = false) => {
  if (!Array.isArray(arr)) return err(id, `${field} is not an array`);
  if (arr.length < min) return err(id, `${field} has ${arr.length} entries, needs at least ${min}`);
  arr.forEach((v, i) => i18n(id, `${field}[${i}]`, v, allowEmpty));
  return undefined;
};

function validate(c) {
  const id = c && c.id ? String(c.id) : "(missing id)";
  if (!c || typeof c !== "object") return err(id, "not an object");
  if (!/^chk-[a-z0-9-]+-\d+$/.test(id)) err(id, "id must match chk-<slug>-<n>");
  if (!SPINE.has(c.concept)) err(id, `concept "${c.concept}" is not a spine slug`);
  if (!KINDS.has(c.kind)) err(id, `kind "${c.kind}" is not one of ${[...KINDS].join("|")}`);
  if (!TRACKS.has(c.track)) err(id, `track "${c.track}" is not one of ${[...TRACKS].join("|")}`);
  if (id.startsWith("chk-") && c.concept && !id.startsWith(`chk-${c.concept}-`)) {
    err(id, `id does not carry its own concept slug (${c.concept})`);
  }
  // A transfer item names the domain its SCENARIO is set in. It must be a real domain,
  // it must not be the concept's own (that is not a second context), and the two must
  // have an authored `leansOn` relationship.
  if (c.transferTo !== undefined) {
    if (!DOMAIN_IDS.has(c.transferTo)) {
      err(id, `transferTo "${c.transferTo}" is not a domain id`);
    } else if (c.transferTo === DOMAIN_OF.get(c.concept)) {
      err(id, `transferTo "${c.transferTo}" is the concept's own domain — that is not a second context`);
    } else if (!(RELATED_DOMAINS.get(c.concept) ?? new Set()).has(c.transferTo)) {
      err(id, `transferTo "${c.transferTo}" has no authored leansOn edge with ${c.concept} — ` +
              `add the edge to curriculum.json, or the transfer claim is unfounded`);
    }
  }

  i18n(id, "prompt", c.prompt);
  i18n(id, "explain", c.explain);
  // An `explain` that only restates the answer teaches nothing (section 9 step 5).
  if (c.explain?.en && words(c.explain.en) < 12) warn(id, `explain.en is only ${words(c.explain.en)} words — does it say WHY?`);

  switch (c.kind) {
    case "cloze": {
      // Empty segments are legal: a cloze may open or close with a blank.
      i18nArray(id, "segments", c.segments, 2, true);
      // …but not ALL of them, which would leave no sentence at all.
      if (Array.isArray(c.segments) && c.segments.every((s2) => !String(s2?.en || "").trim())) {
        err(id, "every segment is empty — there is no sentence to complete");
      }
      i18nArray(id, "bank", c.bank, 3);
      if (!Array.isArray(c.answers) || !c.answers.length) return err(id, "answers missing");
      if (Array.isArray(c.segments) && c.segments.length !== c.answers.length + 1) {
        err(id, `segments (${c.segments.length}) must be answers (${c.answers.length}) + 1, or the sentence renders wrong`);
      }
      c.answers.forEach((a, i) => {
        if (!Number.isInteger(a) || a < 0 || a >= (c.bank || []).length) {
          err(id, `answers[${i}] = ${a} is out of range for a bank of ${(c.bank || []).length}`);
        }
      });
      if (new Set(c.answers).size !== c.answers.length) warn(id, "the same bank entry fills two blanks");
      break;
    }
    case "order": {
      i18nArray(id, "items", c.items, 3);
      break;
    }
    case "match": {
      i18nArray(id, "left", c.left, 2);
      i18nArray(id, "right", c.right, 2);
      if (!Array.isArray(c.pairs) || !c.pairs.length) return err(id, "pairs missing");
      const seenL = new Set(), seenR = new Set();
      c.pairs.forEach((p, i) => {
        if (!Array.isArray(p) || p.length !== 2) return err(id, `pairs[${i}] is not a [left,right] tuple`);
        const [l, r] = p;
        if (!Number.isInteger(l) || l < 0 || l >= (c.left || []).length) err(id, `pairs[${i}][0] = ${l} out of range`);
        if (!Number.isInteger(r) || r < 0 || r >= (c.right || []).length) err(id, `pairs[${i}][1] = ${r} out of range`);
        if (seenL.has(l)) err(id, `left[${l}] is matched twice`);
        if (seenR.has(r)) err(id, `right[${r}] is matched twice`);
        seenL.add(l); seenR.add(r);
        return undefined;
      });
      if (Array.isArray(c.left) && c.pairs.length !== c.left.length) {
        err(id, `${c.left.length} left items but ${c.pairs.length} pairs — every left item needs a match`);
      }
      // A 2x2 match is a coin flip that NO shuffle can fix: linking row i to row i
      // yields the same pair SET whichever way two rows are ordered, so the
      // positional exploit is correct 100% of the time and blind guessing is 50%.
      // The floor is a content rule, not a display rule.
      if (Array.isArray(c.left) && c.left.length < 3) {
        err(id, `only ${c.left.length} pairs — a match under 3 pairs is guessable (1/${c.left.length === 2 ? 2 : 1}); add a real third pair`);
      }
      // A spare right-hand entry is REQUIRED for new content, not merely encouraged.
      //
      // Measured over the 93 shipped match checks: 78 have right.length ===
      // left.length, and for those the mean blind-guess clear probability is 8.01%
      // against 1.06% for the 15 that carry a spare — an 8x difference — because
      // without a spare the assignment is a permutation rather than an injection.
      // And a learner who knows n-1 pairs gets the last one with certainty instead
      // of 50%.
      //
      // This was a WARNING, which is exactly why 78 of them shipped: a warning in a
      // 300-line output is a warning nobody reads. It is now an error for anything
      // merged from here on. The 78 already in the corpus are recorded in
      // tools/match-spare-baseline.txt — a ratchet, not an amnesty: the list can
      // only shrink, and `--check` fails if an id NOT on it lacks a spare.
      if (Array.isArray(c.right) && Array.isArray(c.left) && c.right.length === c.left.length) {
        if (BASELINED_NO_SPARE.has(id)) {
          warn(id, `no spare right-hand entry (baselined; the last pair falls to elimination)`);
        } else {
          err(id, `${c.left.length} pairs but only ${c.right.length} right-hand entries — add one unmatched entry, or a learner who knows ${c.left.length - 1} pairs gets the last free (blind-guess clear rises from ~1% to ~8%)`);
        }
      }
      break;
    }
    case "categorize": {
      i18nArray(id, "buckets", c.buckets, 2);
      if (!Array.isArray(c.items) || c.items.length < 4) return err(id, "categorize needs at least 4 items");
      const used = new Set();
      c.items.forEach((it, i) => {
        if (!it || typeof it !== "object") return err(id, `items[${i}] is not an object`);
        i18n(id, `items[${i}].label`, it.label);
        if (!Number.isInteger(it.bucket) || it.bucket < 0 || it.bucket >= (c.buckets || []).length) {
          err(id, `items[${i}].bucket = ${it.bucket} out of range for ${(c.buckets || []).length} buckets`);
        } else used.add(it.bucket);
        return undefined;
      });
      // A bucket nothing sorts into is a decoy that teaches the wrong boundary.
      (c.buckets || []).forEach((_, i) => { if (!used.has(i)) err(id, `buckets[${i}] has no items`); });
      break;
    }
    default:
      break;
  }
  return undefined;
}

// ── Run ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const dry = args.includes("--dry");
const files = args.filter((a) => !a.startsWith("--"));

const shipped = JSON.parse(fs.readFileSync(CHECKS, "utf8"));

if (checkOnly) {
  shipped.checks.forEach(validate);
  report(`shipped checks (${shipped.checks.length})`);
  process.exit(errors.length ? 1 : 0);
}

if (!files.length) {
  console.error("usage: node tools/merge-checks.cjs <batch.json…> [--dry]  |  --check");
  process.exit(2);
}

const incoming = [];
for (const f of files) {
  if (!fs.existsSync(f)) { console.error(`missing input: ${f}`); process.exit(2); }
  let blob;
  try { blob = JSON.parse(fs.readFileSync(f, "utf8")); }
  catch (e) { console.error(`${f}: not valid JSON — ${e.message}`); process.exit(2); }
  const arr = Array.isArray(blob) ? blob : blob.checks;
  if (!Array.isArray(arr)) { console.error(`${f}: expected {checks:[…]} or a bare array`); process.exit(2); }
  for (const c of arr) incoming.push({ ...c, _file: f });
}

const existingIds = new Set(shipped.checks.map((c) => c.id));
const seen = new Set();
const accepted = [];
for (const c of incoming) {
  const { _file, ...check } = c;
  const before = errors.length;
  validate(check);
  if (errors.length > before) { errors.push(`  ↑ from ${_file}`); continue; }
  if (existingIds.has(check.id)) { err(check.id, `already exists in checks.json — refusing to clobber (from ${_file})`); continue; }
  if (seen.has(check.id)) { err(check.id, `duplicate id within this merge (from ${_file})`); continue; }
  seen.add(check.id);
  accepted.push(check);
}

function report(label) {
  console.log(`\n${label}`);
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }
  if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    for (const e of errors) console.log(`  ✗ ${e}`);
  } else {
    console.log("✓ no structural errors");
  }
}

report(`validated ${incoming.length} incoming check(s) from ${files.length} file(s)`);

if (errors.length) {
  console.log("\nRefusing to merge. Fix the batch files — never hand-patch checks.json.");
  process.exit(1);
}

// Coverage delta, so the merge reports what it actually bought.
const byConcept = {};
for (const c of accepted) byConcept[c.concept] = (byConcept[c.concept] || 0) + 1;
const byKind = {};
for (const c of accepted) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
console.log(`\n${accepted.length} check(s) across ${Object.keys(byConcept).length} concept(s): ${JSON.stringify(byKind)}`);

if (dry) { console.log("\n--dry: nothing written."); process.exit(0); }

shipped.checks.push(...accepted);
fs.writeFileSync(CHECKS, JSON.stringify(shipped, null, 1));
console.log(`✓ checks.json now holds ${shipped.checks.length} checks`);
