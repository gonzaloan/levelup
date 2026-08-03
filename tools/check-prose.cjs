#!/usr/bin/env node
/**
 * The prose gate: does a concept teach, or does it just read well?
 *
 * Why this exists, in numbers. An audit of all 178 shipped concepts found the
 * writing contract in `docs/curriculum/REWRITE-CONTRACT.md` adopted at 1/178:
 *   • 177 contained zero `**bold**`, zero `- bullets`, zero `## labels` — the
 *     renderer had supported all three for a release, and the content used none.
 *   • 79 contained no digit at all. No number, no threshold, no cost.
 *   • Only 51 named both a cost and a cheaper alternative to rule out first,
 *     which is the entire spine of the contract. Exactly 1 labelled them.
 *   • 63 used the same "The judgment is…" pivot; 614 em-dashes across the corpus.
 *
 * A rule that is only written down is a rule that is 99% ignored. So the contract
 * gets a gate, and the gate ratchets: a baseline file lists what was already
 * shipped, everything NOT in the baseline is held to the rule, and an entry that
 * starts passing must be deleted. The list can only shrink.
 *
 * Deliberately checkable-only. This gate cannot tell whether a definition is
 * good; it can tell whether the concept has structure, a number, a named cost,
 * and no banned tic. The judgment stays with the reviewers — this just stops the
 * same measurable defect from being re-shipped 177 times.
 *
 * Usage: node tools/check-prose.cjs              # gate: exit 1 on a new failure
 *        node tools/check-prose.cjs --audit      # full report, always exit 0
 *        node tools/check-prose.cjs --baseline   # rewrite the baseline from HEAD
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const LESSONS = path.join(ROOT, "src/content/data/lessons.json");
const SPINE = path.join(ROOT, "src/content/data/curriculum.json");
const BASELINE_FILE = path.join(__dirname, "prose-baseline.txt");

// ── The rules ────────────────────────────────────────────────────────────

/**
 * Banned words. Two tiers, because they fail differently.
 *
 * HARD are words that are always a symptom: they carry no information the
 * sentence didn't already have. SOFT are words that have a legitimate use but
 * are overwhelmingly filler here, so they're capped per concept rather than
 * forbidden.
 */
const BANNED_WORDS = [
  // NOT "leverage": see BANNED_SHAPES below. The NOUN is this domain's core
  // vocabulary — a Staff/Principal career is defined by leverage — and the corpus
  // uses it that way 102 times ("your leverage is…", "the highest-leverage move")
  // with ZERO uses of the corporate verb. Banning the word wholesale flagged 113
  // correct sentences, and a gate that fires on correct content trains people to
  // bypass the gate. Only the verb form is banned, as a shape.
  "robust", "robustly", "robustness",
  "harness", "harnesses", "harnessing",
  "crucial", "crucially", "seamless", "seamlessly",
  "cutting-edge", "game-changing", "game-changer",
  "delve", "delves", "delving", "showcase", "showcases", "showcasing",
  "pivotal", "intricate", "intricacies", "meticulous", "meticulously",
  "realm", "realms", "embark", "embarks", "tapestry",
  "plethora", "myriad", "furthermore", "moreover",
];
const BANNED_PHRASES = [
  "best practice", "best practices",
  "it's important to note", "it is important to note",
  "in today's", "at the end of the day", "when it comes to",
  "in conclusion", "ever-evolving", "ever-changing",
];

/**
 * Banned SHAPES — the tics that survive a word blocklist, which is why they
 * matter more. Each was counted in the corpus before being banned; the count is
 * the justification, not taste.
 */
const BANNED_SHAPES = [
  // The corporate VERB, not the noun. "leverage the existing platform" is the
  // tell; "your leverage is the constraint you set" is the subject of this whole
  // curriculum. Matching the verb needs an object after it, which is what
  // separates the two.
  {
    re: /\bleverag(e|es|ed|ing)\s+(the|a|an|your|our|its|their|this|these|those|existing|\w+ing)\b/i,
    why: "\"leverage\" as a verb — say what you actually do with the thing",
  },
  // 63 concepts, 28 of them as the second paragraph's opener. The trigger this
  // phrase introduces belongs under `## When it makes sense`.
  { re: /\bThe (judgment|judgement) (is|call is)\b/i, why: "the \"The judgment is…\" pivot (63 concepts had it)" },
  { re: /\bThe practical move is\b/i, why: "the \"The practical move is\" pivot" },
  { re: /\bThe discipline is\b/i, why: "the \"The discipline is\" pivot" },
  // 19 concepts. A hook that delays the definition by one sentence.
  { re: /(^|\n)\s*Here'?s the\b/i, why: "\"Here's the…\" as an opener (19 concepts had it)" },
  { re: /\bnot just\b[^.!?]{0,80}\bbut\b/i, why: "\"not just X but Y\" negative parallelism" },
  { re: /\bnot only\b[^.!?]{0,80}\bbut also\b/i, why: "\"not only X but also Y\"" },
  { re: /\b(serves|functions|acts) as\b/i, why: "\"serves/functions/acts as\" — say what it does" },
  // Stock metaphors reused verbatim across the corpus. A repeated metaphor is
  // worse than a dull one: the reader recognizes the mould.
  { re: /\bwearing a costume\b/i, why: "retired stock metaphor (used 5x)" },
  { re: /\bis (a wish|decoration|wallpaper)\b/i, why: "retired stock metaphor (used 3x)" },
  { re: /\bheroics?\b/i, why: "retired stock metaphor (used 8x)" },
];

/**
 * The lesson-overview tic: "you stop being X and become Y".
 *
 * The first version of this rule required the literal opener `At L#`/`At this
 * level` and the literal `you stop` inside the same clause. That caught 12 of 35
 * overviews — and an audit measuring the SHAPE rather than the wording found 17.
 * The five it missed are the same sentence with a different subject or verb:
 *
 *   "At L7 in Technical Depth your job stops being 'make this system correct'…"
 *   "At L4, your influence stops being about the code you personally write and starts…"
 *   "L5 is where you stop being judged by the tickets you close and start…"
 *
 * A gate that under-reports its own headline defect by a third teaches people the
 * defect is smaller than it is. So the rule now matches the construction — some
 * subject stops doing one thing and starts/becomes another — with no dependence
 * on how the sentence opens.
 */
const OVERVIEW_TEMPLATE =
  /\b(you|your \w+(?: \w+)?)\s+(?:stops?|stopped)\s+(?:being\s+|to\s+be\s+)?[^.]{0,150}?\b(?:and|then|,)\s*(?:you\s+)?(?:start|starts|begin|begins|become|becomes)\b/i;

/** A digit with a unit, or a bare figure — the "does this concept cost anything" test. */
const HAS_NUMBER = /\d/;

/** Names a cost. */
const NAMES_COST = /\b(cost|costs|costly|pay|pays|price|priced|budget|spend|spends|tax|overhead|you give up|in exchange)\b/i;

/** Rules out a cheaper option first — the contract's own spine. */
const CHEAPER_FIRST = /\b(cheaper|cheapest|simpler|simplest|before you|first try|try .{0,20}first|instead of|unless|only .{0,20}(if|when)|rule out)\b/i;

/** Names a real failure, not a caveat. */
const NAMES_FAILURE = /\b(fail|fails|failed|failure|outage|breaks|broke|broken|crash|crashes|corrupt|stall|stalls|timeout|times out|lost|loses|silently|regress)\b/i;

/** The four authored marks. Structure = at least one of them. */
const HAS_BOLD = /\*\*[^*]+\*\*/;
const HAS_BULLET = /(^|\n)\s*[-*+]\s+\S/;
const HAS_LABEL = /(^|\n)##\s+\S/;

/** First two words carry the line — a label may not open with filler. */
const FILLER_OPENERS = /^(it|this|that|these|those|there|when|generally|usually|in order to|one of|some|many)\b/i;

/**
 * Spanish tokens that must never appear in an `.en` string.
 *
 * The audit found `contrapartida` shipped inside English prose on
 * `cloud-platform-l3/regions-azs-and-blast-radius`. Nothing checked the en
 * direction — CLAUDE.md commits to "no calques" only for es. This closes it.
 * Kept to words that cannot be an English word or a proper noun.
 */
const ES_IN_EN = /\b(contrapartida|también|además|sin embargo|entonces|porque|aunque|mientras|siempre|nunca|cuál|cómo|qué|así|hacia|desde|según|través|niveles|aislamiento|compensación)\b/i;

// ── Field walkers ─────────────────────────────────────────────────────────

const findings = [];
function flag(where, rule, detail) {
  findings.push({ where, rule, detail });
}

function countOf(text, re) {
  return (text.match(new RegExp(re.source, "g" + (re.flags.includes("i") ? "i" : ""))) || []).length;
}

/** Every learner-facing en string under a value, with its path. */
function walkEn(value, prefix, out) {
  if (value === null || value === undefined) return out;
  if (typeof value === "object" && typeof value.en === "string" && typeof value.es === "string") {
    out.push([prefix, value.en]);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkEn(v, `${prefix}[${i}]`, out));
    return out;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) walkEn(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

/** Checks that apply to any learner-facing prose, in either locale. */
function checkAnyProse(where, text) {
  const lower = text.toLowerCase();
  for (const w of BANNED_WORDS) {
    if (new RegExp(`\\b${w.replace("-", "[- ]")}\\b`, "i").test(text)) flag(where, "banned-word", w);
  }
  for (const p of BANNED_PHRASES) {
    if (lower.includes(p)) flag(where, "banned-phrase", p);
  }
  for (const s of BANNED_SHAPES) {
    if (s.re.test(text)) flag(where, "banned-shape", s.why);
  }
}

/**
 * The concept-level substance checks. These are the ones the audit showed are
 * both the most-failed and the most fixable.
 */
function checkConceptProse(lessonId, c) {
  const where = `${lessonId}/${c.slug}`;
  const en = c.explanation?.en ?? "";
  const es = c.explanation?.es ?? "";

  // 1. STRUCTURE — 177/178 failed this. The renderer supports it; use it.
  const structured = HAS_BOLD.test(en) || HAS_BULLET.test(en) || HAS_LABEL.test(en);
  if (!structured) flag(where, "no-structure", "explanation has no **bold**, no `- bullet`, no `## label`");
  // Structure has to exist in BOTH locales or the ES reader gets the wall.
  if (structured && !(HAS_BOLD.test(es) || HAS_BULLET.test(es) || HAS_LABEL.test(es))) {
    flag(where, "structure-en-only", "explanation.es has no structure while .en does");
  }

  // 2. A REAL NUMBER — 79/178 had no digit anywhere.
  if (!HAS_NUMBER.test(en)) flag(where, "no-number", "explanation contains no digit at all");

  // 3. THE CONTRACT'S SPINE — a named cost AND a cheaper option ruled out first.
  if (!NAMES_COST.test(en)) flag(where, "no-cost", "explanation never names what this costs");
  if (!CHEAPER_FIRST.test(en)) flag(where, "no-cheaper-first", "explanation never rules out a cheaper option first");

  // 4. A NAMED FAILURE, somewhere on the pane.
  //
  // Originally this only looked at `explanation`, and flagged 90 concepts that DO
  // name a failure — in `pitfalls`, which is exactly where the contract asks for
  // it ("3 max, each a real failure with its symptom") and which renders on the
  // same pane, always open. The rule was checking the wrong field. What matters is
  // that the reader is told how this breaks, not which JSON key carries it.
  const failureText = [
    en,
    ...(c.pitfalls ?? []).map((p) => p.en ?? ""),
    ...(c.children ?? []).map((ch) => ch.detail?.en ?? ""),
    c.example?.walkthrough?.en ?? "",
  ].join(" ");
  if (!NAMES_FAILURE.test(failureText)) {
    flag(where, "no-failure", "nothing on the pane names how this breaks (checked explanation, pitfalls, children, example)");
  }

  // 5. LENGTH — the contract targets 170-230 words; the corpus clustered at 268
  //    because it was written to a quota. Over 300 means >200 words below the fold.
  const words = en.trim().split(/\s+/).filter(Boolean).length;
  if (words > 300) flag(where, "too-long", `${words} words (target 170-230; move the rest to \`depth\`)`);
  if (words < 120) flag(where, "too-thin", `${words} words`);

  // 6. PUNCTUATION TICS — the corpus averaged 3.5 em-dashes per concept.
  const dashes = countOf(en, /—/);
  if (dashes > 1) flag(where, "em-dash-flood", `${dashes} em-dashes (max 1)`);
  const semis = countOf(en, /;/);
  if (semis > 1) flag(where, "semicolon-flood", `${semis} semicolons (max 1)`);

  // 7. DEFINITION FIRST — an antithesis or a negation before the thing is named.
  const firstSentence = en.split(/(?<=[.!?])\s/)[0] ?? "";
  if (/\bis not\b|\bisn'?t\b|\baren'?t\b|\bare not\b/i.test(firstSentence)) {
    flag(where, "not-definition-first", `opens by negating: "${firstSentence.slice(0, 90)}…"`);
  }

  // 8. LOCALE BLEED — Spanish inside English prose. Unguarded until now.
  for (const [p, text] of walkEn(c, where, [])) {
    const m = ES_IN_EN.exec(text);
    if (m) flag(where, "locale-bleed", `Spanish "${m[1]}" inside ${p}`);
  }

  // 9. SCANNABLE LABELS — first two words carry the line.
  for (const [i, k] of (c.keyPoints ?? []).entries()) {
    if (FILLER_OPENERS.test((k.en ?? "").trim())) {
      flag(where, "filler-opener", `keyPoints[${i}] opens with filler: "${k.en.slice(0, 50)}…"`);
    }
  }
  for (const [i, ch] of (c.children ?? []).entries()) {
    if (FILLER_OPENERS.test((ch.label?.en ?? "").trim())) {
      flag(where, "filler-opener", `children[${i}].label opens with filler`);
    }
  }

  // 10. COMPARE-DIAGRAM INTEGRITY — asymmetric sides read as a tradeoff and
  //     teach nothing. `compare` is the most common kind in the corpus (76).
  for (const [field, d] of [["diagram", c.diagram], ["architecture", c.architecture]]) {
    if (!d || d.kind !== "compare") continue;
    const L = d.left?.points?.length ?? 0;
    const R = d.right?.points?.length ?? 0;
    if (L !== R) flag(where, "compare-asymmetric", `${field}: left has ${L} points, right has ${R}`);
    if (L > 5 || R > 5) flag(where, "compare-too-long", `${field}: more than 5 rows per side`);
  }

  // 11. BANNED WORDS AND SHAPES in every learner-facing field, both locales.
  for (const [p, text] of walkEn(c, where, [])) checkAnyProse(p, text);
}

// ── Main ──────────────────────────────────────────────────────────────────

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return new Set();
  return new Set(
    fs.readFileSync(BASELINE_FILE, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
  );
}

function main() {
  const audit = process.argv.includes("--audit");
  const rebase = process.argv.includes("--baseline");

  const lessons = JSON.parse(fs.readFileSync(LESSONS, "utf8")).lessons;
  const spine = JSON.parse(fs.readFileSync(SPINE, "utf8"));

  for (const l of lessons) {
    // The lesson overview's own tic: 19 of 35 open identically.
    if (OVERVIEW_TEMPLATE.test(l.overview?.en ?? "")) {
      flag(`${l.lessonId}/overview`, "overview-template", "uses the \"X stops being A and becomes B\" template (17 of 35 lessons do)");
    }
    for (const [p, text] of walkEn(l.overview, `${l.lessonId}/overview`, [])) checkAnyProse(p, text);
    for (const c of l.concepts) checkConceptProse(l.lessonId, c);
    // Quiz stems and rationales are learner-facing too, and slop there is just
    // as visible — it is read at the moment of being graded.
    for (const [i, it] of (l.midQuiz ?? []).entries()) {
      for (const [p, text] of walkEn(it, `${l.lessonId}/midQuiz[${i}]`, [])) checkAnyProse(p, text);
    }
    for (const [i, sec] of (l.cheatSheet ?? []).entries()) {
      for (const [p, text] of walkEn(sec, `${l.lessonId}/cheat[${i}]`, [])) checkAnyProse(p, text);
    }
  }

  // The spine's `why` — it renders FIRST on every concept pane, and 171 of 178
  // opened with the curriculum designer's voice instead of the learner's.
  for (const d of spine.domains) {
    for (const b of d.levels) {
      for (const c of b.concepts) {
        const w = `${d.id}/${b.level}/${c.slug}`;
        const why = c.why?.en ?? "";
        if (/^\s*(Trains|Teaches|Builds|Trusting)\b/i.test(why)) {
          flag(w, "why-formulaic", `\`why\` opens "${why.split(" ")[0]}…" — write the question a learner would ask`);
        }
        if (!why.includes("?")) flag(w, "why-not-a-question", "`why` is not a question");
        const n = why.trim().split(/\s+/).length;
        if (n > 34) flag(w, "why-too-long", `${n} words (max ~30)`);
        for (const [p, text] of walkEn(c.why, w, [])) checkAnyProse(p, text);
      }
    }
  }

  // Group by artifact so the baseline is per-concept, not per-finding: a concept
  // is either rewritten to the contract or it is not.
  const byWhere = new Map();
  for (const f of findings) {
    const list = byWhere.get(f.where) ?? [];
    list.push(f);
    byWhere.set(f.where, list);
  }

  if (rebase) {
    const header = [
      "# Concepts that predate the prose gate and still fail it — a RATCHET.",
      "#",
      "# The gate FAILS on anything not listed here, so new and rewritten work is",
      "# held to docs/curriculum/REWRITE-CONTRACT.md; and an entry that starts",
      "# passing must be deleted, so this list can only shrink.",
      "#",
      "# Do NOT add a line to make a build pass. Rewrite the concept.",
      "# `node tools/check-prose.cjs --audit` prints every finding.",
      "",
    ].join("\n");
    fs.writeFileSync(BASELINE_FILE, header + [...byWhere.keys()].sort().join("\n") + "\n", "utf8");
    console.log(`✓ baseline rewritten: ${byWhere.size} artifact(s) currently failing`);
    return;
  }

  const baseline = loadBaseline();
  const fresh = [...byWhere.entries()].filter(([w]) => !baseline.has(w));
  const stale = [...baseline].filter((w) => !byWhere.has(w));

  if (audit) {
    const counts = new Map();
    for (const f of findings) counts.set(f.rule, (counts.get(f.rule) ?? 0) + 1);
    console.log(`prose audit — ${findings.length} finding(s) across ${byWhere.size} artifact(s)\n`);
    for (const [rule, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)}  ${rule}`);
    }
    console.log("");
    for (const [where, list] of [...byWhere.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 40)) {
      console.log(`${where} (${list.length})`);
      for (const f of list.slice(0, 6)) console.log(`    ${f.rule}: ${f.detail}`);
    }
    return;
  }

  if (stale.length) {
    console.error(`✗ ${stale.length} baseline entr(ies) no longer fail — delete them so the ratchet keeps ratcheting:`);
    for (const s of stale.slice(0, 20)) console.error(`    ${s}`);
    process.exitCode = 1;
  }
  if (fresh.length) {
    console.error(`\n✗ ${fresh.length} artifact(s) fail the prose contract and are not baselined:\n`);
    for (const [where, list] of fresh) {
      console.error(`  ${where}`);
      for (const f of list) console.error(`      ${f.rule}: ${f.detail}`);
    }
    console.error("\nSee docs/curriculum/REWRITE-CONTRACT.md. Fix the writing, not the baseline.");
    process.exitCode = 1;
  }
  if (!fresh.length && !stale.length) {
    console.log(`✓ prose gate: no new artifact violates the contract (${baseline.size} baselined, ${findings.length} known finding(s))`);
  }
}

main();

module.exports = { checkConceptProse, BANNED_WORDS, BANNED_SHAPES };
