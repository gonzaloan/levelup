#!/usr/bin/env node
/**
 * Traceability gate: an artifact may not introduce a number the concept doesn't have.
 *
 * Two review rounds found the same defect twelve times: a `code` artifact whose
 * figures were invented rather than taken from the concept's own authored
 * example. Five of those reached a conclusion OPPOSITE to what the example
 * teaches, so the artifact and the "worked example" fold on the same pane told
 * the learner different things about the same scenario.
 *
 * Round 1 fixed the eight a reviewer named. That is not a fix — the rule was
 * being applied by hand, so the next artifact would drift again. This makes it
 * checkable: every salient numeral in a snippet must appear somewhere in the
 * concept's own prose (example, explanation, depth, keyPoints, pitfalls,
 * children, diagram, flashcards).
 *
 * Deliberately narrow, because a noisy gate gets bypassed:
 *   • Only "salient" numbers count — money, percentages, and any integer ≥ 3
 *     digits or with a thousands separator. Small integers (list indices, "3
 *     engineers", ports, HTTP codes, a `[5m]` window) are excluded: they carry
 *     no claim and would bury the real findings.
 *   • Numbers are compared by VALUE, not by string, so $34k / 34_000 / 34,000
 *     all match, and 40 matches "40 percent".
 *   • Units the artifact legitimately derives are allowed: a value equal to a
 *     product, sum or difference of two traced values passes, because computing
 *     with the example's numbers is exactly what these artifacts are for.
 *
 * Usage: node tools/check-trace.cjs            # all concepts
 *        node tools/check-trace.cjs --verbose  # show every allowed derivation
 */
const fs = require("node:fs");
const path = require("node:path");

const LESSONS = path.join(__dirname, "..", "src/content/data/lessons.json");

/**
 * Artifacts that predate this gate and still carry an untraced figure.
 *
 * Ratcheting, not amnesty: the gate FAILS on any artifact not in this list, so
 * new work is held to the rule; and a listed artifact that starts passing must be
 * removed, so the list can only shrink. Each entry is a real thing to fix — run
 * `node tools/check-trace.cjs --audit` to see the numbers involved.
 *
 * Do not add to this file to make a build pass. Fix the number, or extend the
 * concept's example so the number is traceable.
 */
const BASELINE_FILE = path.join(__dirname, "trace-baseline.txt");

/** Collect every number a string mentions, as normalized values. */
/**
 * Small numbers authored as WORDS.
 *
 * Examples are written for humans, so a headcount is "two engineers for two
 * quarters", not "2". The gate flagged the artifact's correct `# 2 engineers, 2
 * quarters` as untraced because its example spelled the number out — a false
 * positive on content that agrees perfectly with its source.
 */
const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, dozen: 12, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, half: 0.5, quarter: 0.25,
};

function numbersIn(text) {
  const out = new Set();
  for (const [word, value] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) out.add(value);
  }
  // 1_000 / 1,000 / 1000 / 12.5 / $0.037 — and k/m suffixes ($34k, 2.1M).
  // The lookahead rejects a following letter (so "15 minutes" isn't 15 million)
  // but must NOT reject a sentence-final period. `(?![\w.])` did, so "$110,000."
  // backtracked and parsed as 110 — putting a correct, traced artifact into the
  // baseline for a defect it did not have, and injecting bogus operands (110,
  // 1.1, 11000) that could absolve real inventions. `(?!\.?\d)` allows a decimal
  // point only when a digit follows it, which is the actual distinction.
  const re = /(\d[\d_,]*(?:\.\d+)?)([kKmM])?(?![\w]|\.\d)/g;
  let mt;
  while ((mt = re.exec(text)) !== null) {
    const raw = mt[1].replace(/[_,]/g, "");
    let v = Number(raw);
    if (!Number.isFinite(v)) continue;
    const suffix = (mt[2] || "").toLowerCase();
    if (suffix === "k") v *= 1_000;
    // Uppercase M only. Lowercase `m` is MINUTES in this corpus's YAML
    // (`duration: 10m`, `windows: [5m, 1h]`), and reading it as millions
    // manufactured a 10,000,000 that appears in no artifact — the gate reporting
    // a figure the author never wrote is the fastest way to lose their trust.
    if (mt[2] === "M") v *= 1_000_000;
    out.add(v);
    // A "$34k" in prose is often written "34,000" in code, and vice versa.
    if (suffix) out.add(Number(raw));
    // Percentages cross between prose and code as a ratio: an example saying
    // "58% toil" is the same claim as `MEASURED_TOIL = 0.58`, and "99.9%" is
    // `0.999`. Register both forms so the gate doesn't flag the conversion —
    // but ONLY for plausible percentages. Registering v*100 for every number
    // put values like 20000 and 300 (from "200" and "3") into the operand set,
    // and their coincidental product absolved an invented $6,000,000.
    if (v <= 100) out.add(v / 100);
    if (v <= 1) out.add(v * 100);
  }
  return out;
}

/**
 * Contexts where a number is a literal, not a claim about the world.
 *
 * The first version of this gate flagged 33 artifacts, and a sample showed the
 * findings were an order id in a URL (`/orders/12345`), a date, `max_tokens=256`,
 * a computed mean printed as a comment, and seconds-in-a-day. A gate whose output
 * is mostly noise gets ignored, so these are stripped before checking. Each
 * pattern is here because a real false positive matched it.
 */
const LITERAL_CONTEXT = [
  /\bhttps?:\/\/\S+/g,                    // URLs
  /\/[\w-]*\/\d+/g,                       // path segments: /orders/12345
  /\b\d{4}-\d{2}-\d{2}\b/g,               // ISO dates
  /\b(?:max_tokens|top_k|top_p|seed|temperature|port|timeout_ms|limit)\s*=\s*[\d.]+/g,
  /\b(?:HTTP\/)?\d{3}\s+(?:OK|No Content|Not Found|Created|Bad Request|Forbidden|Conflict|Too Many)/g,
  // NOT a duration strip. This used to be /\b\d+\s*(?:h|min|ms|s|d)\b/, which
  // deleted "800 ms" and "2.4 s" before salience ever saw them — cancelling out
  // the hyphenated-duration rule added to `salient()` for exactly these claims,
  // and letting an invented "p99 drops to 470 ms" pass in a LATENCY concept.
  // Latency and duration figures are the load-bearing numbers in a third of this
  // corpus, so `ms`/`s`/`min`/`h` are claim nouns (see CLAIM_NOUNS) rather than
  // literals to discard.
  /\{[^}]*:[<>^]?\d+[,.]?\d*[fd%,]?\}/g,  // f-string format specs: {v:>9,.0f}
  /:\s*\d+\.\d+[fd]\b/g,                  // .2f precision specs
  // Arithmetic operands inside a code expression are part of a computation, not
  // a claim: `n_nodes // 2 + 1`, `x - 1`. Anchored to an IDENTIFIER on one side,
  // so it strips `foo // 2 + 1` but leaves prose like "12% is available" and
  // "cut 20%" alone — an unanchored version also swallowed a real 61% claim.
  //
  // The `(?!…UNITS)` guard is load-bearing. A `/` in a UNIT SUFFIX matched the
  // operator alternation, so `$40,000/mo` was consumed down to `$40` — reducing
  // every money-per-period figure in the corpus to its leading digits, and
  // letting an invented `$6,000,000/yr` pass in the expected-annual-loss
  // artifact ($6M became 6, which traces to "six incidents"). Per-period money
  // is the dominant unit across the whole cloud-cost family.
  /\b[a-z_][\w.]*\s*[-+*/%]{1,2}\s*\d[\d_.]*/gi,
  /\d[\d_.]*\s*[-+*/%]{1,2}\s*(?!(?:mo|month|yr|year|hr|hour|wk|week|day|min|sec|s|req|GB|TB|MB|kb|core|user|tenant|invocation)\b)[a-z_][\w.]*/gi,
  // "0 rows", "1 node": a count in a code comment describing control flow.
  /(?:^|[\s(])[01]\s+(?:rows?|nodes?|item|items|result|results)\b/g,
  // Zero is never a claim about the world — "warm: 0 ms", "idle saving: ~0".
  // The leading `(?<![\d.,])` is load-bearing: without the comma this ate the
  // "000" out of "$847,000" and the figure parsed as 847.
  // A trailing comma is punctuation ("if 0, read and return") unless a digit
  // follows it, which would make it a thousands separator ("$847,000").
  /(?<![\d.,])0+(?![.\d]|,\d)\s*(?:ms|s|h|min|rows?|items?|results?)?/g,
  // A comparison threshold in an EXPRESSION is part of the computation:
  // `s >= 0.8`, `if p99 > 800`. Anchored to an identifier on the left, because an
  // unanchored version also swallowed prose thresholds ("stays under 800 ms",
  // "p99 to 470 ms") and let two injected latency inventions pass.
  // `==`, `>=`, `<`, `>` — but NOT a bare `=`, which is an ASSIGNMENT. Matching
  // assignment here deleted `revenue_per_hour = 47_500`, the exact invented
  // premise this vocabulary was extended to catch.
];

/**
 * A comparison threshold is a computation in CODE and a claim in a COMMENT.
 *
 * `s >= 0.8` inside an expression is part of the arithmetic. But
 * `# abort when checkout_p99_ms > 1750` states a threshold the reader is asked to
 * believe — and an identifier-anchored strip cannot tell the two apart, because
 * the comment has an identifier on its left too. That let invented abort
 * thresholds pass in the gameday artifact whose original defect WAS its
 * thresholds. So this one is applied per line, and only to non-comment lines.
 */
const CODE_COMPARISON = /\b[a-z_][\w.]*\s*(?:[<>!]=?|==)\s*\d[\d_.]*/gi;
const COMMENT_LINE = /(^|\s)(#|\/\/|--)/;

function stripLiterals(text) {
  let out = text;
  for (const re of LITERAL_CONTEXT) out = out.replace(re, " ");
  return out
    .split("\n")
    .map((line) => (COMMENT_LINE.test(line) ? line : line.replace(CODE_COMPARISON, " ")))
    .join("\n");
}

/**
 * Nouns that turn a small bare integer into a claim.
 *
 * The first version excluded every integer under three digits on the grounds
 * that small numbers "carry no claim". That was wrong for exactly the artifacts
 * where the worst defects lived: "3 engineers for 2 quarters" against an example
 * asking for "one team for a quarter" is a 6x discrepancy in the ask, expressed
 * entirely in single digits. Three of the twelve historical defects were
 * invisible to the gate for this reason alone.
 */
const CLAIM_NOUNS =
  "engineers?|teams?|quarters?|halves|half|weeks?|months?|years?|days?|hours?|minutes?|" +
  "services?|incidents?|accounts?|analysts?|findings?|cells?|zones?|instances?|" +
  "consumers?|classes|tenants?|nines?|engineer-(?:hours?|days?)|" +
  // Time units: a latency or duration figure is a claim, and in a third of this
  // corpus it is THE claim ("p99 under 800 ms", "a 90-minute test suite").
  "ms|s|h|min|sec|secs|seconds?";

/** The numbers that carry a claim. */
function salient(text) {
  const out = new Set();
  // The noun may follow a space ("3 engineers") OR a hyphen ("90-minute test
  // suite", "36-month term") — the hyphenated adjectival form is how half the
  // corpus states a duration, and missing it let two real defects through.
  const re = new RegExp(
    // Same sentence-final-period fix as numbersIn: `(?![\w.])` truncated
    // "$110,000." to 110, so a figure ending a sentence was never seen whole.
    String.raw`(\$\s*)?(\d[\d_,]*(?:\.\d+)?)([kKmM])?(?![\w]|\.\d)(\s*(?:%|percent))?([\s-]*(?:${CLAIM_NOUNS})\b)?`,
    "gi",
  );
  let mt;
  while ((mt = re.exec(text)) !== null) {
    const [, dollar, digits, suffix, pct, noun] = mt;
    const raw = digits.replace(/[_,]/g, "");
    let v = Number(raw);
    if (!Number.isFinite(v)) continue;
    const s = (suffix || "").toLowerCase();
    if (s === "k") v *= 1_000;
    if (suffix === "M") v *= 1_000_000;   // uppercase only — see numbersIn
    const hadSeparator = /[,_]/.test(digits);
    // Salient = a claim: money, a percentage, a separated/large number, or a
    // small integer counting something the reader is asked to believe.
    if (dollar || pct || noun || hadSeparator || suffix || raw.length >= 3) out.add(v);
    // A number sitting alone in a table cell is a claim with its noun in the
    // column header ("consumers | peering links": the 10 was the whole defect).
    else if (/^\s*\|?\s*$/.test(text.slice(Math.max(0, mt.index - 4), mt.index))
             && /^\s*\|/.test(text.slice(mt.index + mt[0].length))) out.add(v);
  }
  return out;
}

/** Every string in a value, recursively — used to gather a concept's own prose. */
function strings(v, acc = []) {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, acc);
  else if (v && typeof v === "object") for (const k of Object.keys(v)) strings(v[k], acc);
  return acc;
}

function main() {
  const verbose = process.argv.includes("--verbose");
  const data = JSON.parse(fs.readFileSync(LESSONS, "utf8"));
  const findings = [];
  let checked = 0;
  // Coverage, not just pass/fail: if most numbers pass by DERIVATION rather than
  // by appearing in the concept, the gate is decorative and should be tightened.
  let totalSalient = 0, totalDirect = 0, totalDerived = 0;

  for (const lesson of data.lessons) {
    for (const c of lesson.concepts) {
      if (!c.code?.snippet) continue;
      checked++;
      const where = `${lesson.lessonId}/${c.slug}`;

      // The concept's own prose — everything EXCEPT the code artifact itself.
      const { code, ...rest } = c;
      const prose = strings(rest).join(" ") + " " + strings(lesson.overview).join(" ");
      const traced = numbersIn(prose);

      // ── The claim surface: PROSE, not executable code ───────────────────
      //
      // A number inside an expression or a fixture is not a claim about the
      // world — `totalCents: 4200`, `search({maxPriceCents: 9000})`,
      // `assert price(300) == 242.25` are a made-up order, a made-up query and a
      // computed assertion. Checking those produced 46 findings, all noise, which
      // is how a gate gets ignored.
      //
      // What DOES make a claim is the artifact's prose: the caption, the
      // annotations, and the comments — that is where "58% toil", "$9,000/hour"
      // and "one team for a quarter" live, and where all twelve historical
      // defects lived. So the claim surface is comment lines plus caption plus
      // annotations. A constant assignment counts too, because
      // `MEASURED_TOIL = 0.58` is a claim wearing a variable name.
      // For a PROSE artifact (markdown, a memo, a diff of a memo) the whole body
      // is the claim — it has no comment syntax, and restricting to comment lines
      // silently stopped checking six of the twelve historical defects.
      const lang = (code.lang || "").toLowerCase();
      // yaml/json too: a policy or experiment spec states its claims as VALUES
      // (`below: 99.9`, `traffic: 25%`), not in comments — the gameday artifact's
      // thresholds were the defect, and comment-only checking missed all of them.
      const proseArtifact = ["markdown", "md", "text", "txt", "diff", "yaml", "yml", "json"].includes(lang);
      const commentary = proseArtifact
        ? code.snippet
        : code.snippet
            .split("\n")
            // A constant assignment is a claim wearing a variable name — but
            // keying on ALLCAPS discriminated by naming convention rather than by
            // meaning, so `revenue_per_hour = 47_500` (lowercase, no comment) got
            // through in the artifact whose whole subject is a money calculation.
            // Match the identifier's VOCABULARY instead, at any case.
            .filter((line) =>
              /(^|\s)(#|\/\/|--)/.test(line) ||
              /^\s*[A-Z][A-Z0-9_]{2,}\s*=/.test(line) ||
              /^\s*(?:const |let |var )?[\w.]*(?:cost|price|revenue|spend|rate|hours?|days?|count|budget|fee|saving|premium|capacity|latency|toil|traffic|p\d\d|monthly|annual|total)[\w.]*\s*[:=]/i.test(line))
            .join("\n");
      const claim = [commentary, ...strings(code.caption ?? {}), ...strings(code.annotations ?? [])].join("\n");
      // Strip literal contexts first: an order id or a format spec is not a claim.
      const used = salient(stripLiterals(claim));

      // ── Derivation, from the CONCEPT's numbers only ────────────────────
      //
      // The first version drew operands from `traced` UNION the snippet's own
      // numbers, which made it vacuous: `1` appears in 56 of 111 snippets, so
      // `a * b === v` with `a = 1, b = v` proved every snippet number from
      // itself. Replaying the twelve historical defects through it, 8 passed —
      // including 4 of the 5 that reached the opposite conclusion to their
      // example. An author could launder any figure by writing its factors into
      // the same snippet: `288,000` was "derived" as `8,000 x 36`, where the 36
      // existed only because the snippet asserted it.
      //
      // So operands come from `traced` only, and a derivation must be real work:
      // no identity (a === 1, b === 1, a === v), no free division, and scaling
      // only by a factor the concept itself mentions or a calendar term.
      // Calendar factors, but ONLY the ones this concept actually talks about.
      // An unconditional list meant any traced figure could be scaled by 30 or
      // 365 into a value the concept never mentions: an invented $6,000,000/yr
      // "derived" as $200,000 x 30 in the expected-annual-loss artifact. A
      // monthly-to-annual conversion is only credible when the concept is
      // discussing months and years in the first place.
      const CALENDAR = [7, 12, 24, 30, 36, 52, 60, 365].filter((k) => traced.has(k));
      const operands = [...traced].filter((n) => n !== 0 && n !== 1);
      const eq = (x, y) => Math.abs(x - y) < 1e-9 || (Math.abs(y) > 1 && Math.abs(x - y) / Math.abs(y) < 1e-9);

      const derivable = (v) => {
        for (const a of operands) {
          if (eq(a, v)) continue;                       // identity is not derivation
          for (const b of operands) {
            if (eq(b, v)) continue;
            // The SAME threshold applies to sums and differences. With ~20 traced
            // operands, small integers are reachable by accident from almost any
            // pair: 36 "derived" as 40-4 and 90 as 60+30, absolving a 36-month
            // term and a 90-minute test suite that neither concept mentions.
            // Above 1000 a hit is a real calculation; below it, it is arithmetic
            // noise and the number has to be in the concept.
            if (v >= 1000 && (eq(a * b, v) || eq(a + b, v) || eq(a - b, v))) return true;
            // Division only as a percentage/ratio OF a traced total, not as a
            // free operation: an unrestricted a/b over ~40 values spans a dense
            // lattice and passed 55% of arbitrary three-digit integers.
            if (b !== 0 && b > 1 && eq(a / b, v) && v < 1) return true;
          }
          // A monthly figure over a term, a rate over a window — but only by a
          // factor the concept mentions, or a real calendar multiple.
          //
          // Products are restricted to results LARGER than any plausible standalone
          // claim. Two small traced integers multiply to a huge number of small
          // values by coincidence: 36 = 4 x 9 and 90 = 3 x 30 both "derived"
          // cleanly, absolving a 36-month term and a 90-minute suite that neither
          // concept mentions. A derivation is only credible when the result is a
          // computed magnitude, not another small integer someone could have typed.
          for (const k of [...operands, ...CALENDAR]) {
            if (Number.isInteger(k) && k >= 2 && k <= 365 && eq(a * k, v) && v >= 1000) return true;
          }
        }
        // A distribution that sums to a traced total — same threshold, same reason.
        if (v >= 1000) {
          for (let i = 0; i < operands.length; i++) {
            for (let j = i + 1; j < operands.length; j++) {
              for (let k = j + 1; k < operands.length; k++) {
                if (eq(operands[i] + operands[j] + operands[k], v)) return true;
              }
            }
          }
        }
        return false;
      };

      const untraced = [...used].filter((v) => !traced.has(v) && !derivable(v));
      totalSalient += used.size;
      totalDirect += [...used].filter((v) => traced.has(v)).length;
      totalDerived += [...used].filter((v) => !traced.has(v) && derivable(v)).length;

      if (untraced.length) {
        findings.push({ where, untraced: untraced.sort((x, y) => y - x).slice(0, 8), total: untraced.length });
      } else if (verbose) {
        console.log(`  ok ${where}`);
      }
    }
  }

  // Ratchet, not amnesty: artifacts written before this gate existed are listed
  // in tools/trace-baseline.txt and reported as known. Anything NOT in that list
  // fails the build, and a listed artifact that starts passing must be removed
  // from the list — so the number can only go down.
  const baseline = new Set(
    fs.existsSync(BASELINE_FILE)
      ? fs.readFileSync(BASELINE_FILE, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      : [],
  );
  const audit = process.argv.includes("--audit");
  const fresh = findings.filter((f) => !baseline.has(f.where));
  const known = findings.filter((f) => baseline.has(f.where));
  const stale = [...baseline].filter((w) => !findings.some((f) => f.where === w));

  const pct = (n) => (totalSalient ? `${Math.round((n / totalSalient) * 100)}%` : "—");
  console.log(`\nchecked ${checked} code artifacts, ${totalSalient} salient number(s)`);
  console.log(`  ${totalDirect} (${pct(totalDirect)}) appear in the concept's own prose`);
  console.log(`  ${totalDerived} (${pct(totalDerived)}) allowed as a derivation from it`);

  const show = (list) => {
    list.sort((a, b) => b.total - a.total);
    for (const f of list) {
      console.log(`  ✗ ${f.where}: ${f.untraced.join(", ")}${f.total > 8 ? ` … +${f.total - 8}` : ""}`);
    }
  };

  if (known.length) {
    console.log(`\n${known.length} known artifact(s) predating this gate (tools/trace-baseline.txt):`);
    if (audit) show(known);
    else console.log("  run with --audit to list them");
  }
  // Report BOTH before exiting. An early `process.exit` on the stale check hid
  // the fresh findings entirely, so an injected defect looked like it had passed
  // whenever the baseline also happened to be out of date — a gate that reports
  // the wrong reason for failing is nearly as bad as one that doesn't fail.
  if (fresh.length) {
    console.error(`\n${fresh.length} artifact(s) introduce numbers their concept never mentions:`);
    show(fresh);
    console.error(
      "\nAn artifact must not invent a figure. Take it from the concept's example,\n" +
      "or extend the example first — the two are read side by side on one pane.",
    );
  }
  if (stale.length) {
    console.error(`\n${stale.length} baseline entry(ies) no longer fail — delete them from tools/trace-baseline.txt:`);
    for (const w of stale) console.error(`  · ${w}`);
  }
  if (fresh.length || stale.length) process.exit(1);
  console.log("\n✓ no new artifact introduces an untraced figure");
}

main();
