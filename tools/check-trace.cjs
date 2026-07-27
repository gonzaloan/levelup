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

/** Collect every number a string mentions, as normalized values. */
function numbersIn(text) {
  const out = new Set();
  // 1_000 / 1,000 / 1000 / 12.5 / $0.037 — and k/m suffixes ($34k, 2.1M).
  // The `(?![\w.])` matters: without it "15 minutes" parsed as 15 million and
  // "40 months" as 40 million, which made the gate report nonsense.
  const re = /(\d[\d_,]*(?:\.\d+)?)([kKmM])?(?![\w.])/g;
  let mt;
  while ((mt = re.exec(text)) !== null) {
    const raw = mt[1].replace(/[_,]/g, "");
    let v = Number(raw);
    if (!Number.isFinite(v)) continue;
    const suffix = (mt[2] || "").toLowerCase();
    if (suffix === "k") v *= 1_000;
    if (suffix === "m") v *= 1_000_000;
    out.add(v);
    // A "$34k" in prose is often written "34,000" in code, and vice versa.
    if (suffix) out.add(Number(raw));
    // Percentages cross between prose and code as a ratio: an example saying
    // "58% toil" is the same claim as `MEASURED_TOIL = 0.58`, and "99.9%" is
    // `0.999`. Register both forms so the gate doesn't flag the conversion.
    out.add(v / 100);
    out.add(v * 100);
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
  /\b(?:HTTP\/)?\d{3}\s+(?:OK|Not Found|Created|Bad Request|Forbidden|Conflict|Too Many)/g,
  /\b\d+\s*(?:h|min|ms|s|d)\b/g,          // durations in code comments
  /\{[^}]*:[<>^]?\d+[,.]?\d*[fd%,]?\}/g,  // f-string format specs: {v:>9,.0f}
  /:\s*\d+\.\d+[fd]\b/g,                  // .2f precision specs
];

function stripLiterals(text) {
  let out = text;
  for (const re of LITERAL_CONTEXT) out = out.replace(re, " ");
  return out;
}

/** The numbers that carry a claim. Small bare integers do not. */
function salient(text) {
  const out = new Set();
  const re = /(\$\s*)?(\d[\d_,]*(?:\.\d+)?)([kKmM])?(?![\w.])(\s*(?:%|percent))?/g;
  let mt;
  while ((mt = re.exec(text)) !== null) {
    const [, dollar, digits, suffix, pct] = mt;
    const raw = digits.replace(/[_,]/g, "");
    let v = Number(raw);
    if (!Number.isFinite(v)) continue;
    const s = (suffix || "").toLowerCase();
    if (s === "k") v *= 1_000;
    if (s === "m") v *= 1_000_000;
    const hadSeparator = /[,_]/.test(digits);
    const isMoney = !!dollar;
    const isPct = !!pct;
    // Salient = a claim: money, a percentage, a separated/large number.
    if (isMoney || isPct || hadSeparator || suffix || raw.length >= 3) out.add(v);
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

  for (const lesson of data.lessons) {
    for (const c of lesson.concepts) {
      if (!c.code?.snippet) continue;
      checked++;
      const where = `${lesson.lessonId}/${c.slug}`;

      // The concept's own prose — everything EXCEPT the code artifact itself.
      const { code, ...rest } = c;
      const prose = strings(rest).join(" ") + " " + strings(lesson.overview).join(" ");
      const traced = numbersIn(prose);

      // Captions and annotations are part of the artifact's claim surface too.
      const claim = [code.snippet, ...strings(code.caption ?? {}), ...strings(code.annotations ?? [])].join("\n");
      // Strip literal contexts first: an order id or a format spec is not a claim.
      const used = salient(stripLiterals(claim));

      // A snippet's own INPUT constants are part of its claim surface, but the
      // numbers it computes from them are not new claims — they are the point of
      // the artifact. `2042` is 812+640+590; `43.2` is 0.001*30*24*60. Treating a
      // printed result as an invented figure would flag every worked calculation,
      // so derivations from anything already on the page are allowed.
      const onPage = new Set([...traced, ...numbersIn(stripLiterals(claim))]);

      const derivable = (v) => {
        for (const a of onPage) {
          if (a === v) continue;
          for (const b of onPage) {
            if (a * b === v || a + b === v || a - b === v) return true;
            if (b !== 0 && Math.abs(a / b - v) < 1e-9) return true;
          }
          // A monthly figure over a term, a rate over a window.
          for (let k = 2; k <= 60; k++) if (a * k === v) return true;
        }
        // Three-term sums (a distribution that adds to a total) and simple
        // percentages of a traced total.
        const vals = [...onPage];
        for (let i = 0; i < vals.length; i++) {
          for (let j = i + 1; j < vals.length; j++) {
            for (let k = j + 1; k < vals.length; k++) {
              if (vals[i] + vals[j] + vals[k] === v) return true;
            }
          }
        }
        return false;
      };

      const untraced = [...used].filter((v) => !traced.has(v) && !derivable(v));

      if (untraced.length) {
        findings.push({ where, untraced: untraced.sort((x, y) => y - x).slice(0, 8), total: untraced.length });
      } else if (verbose) {
        console.log(`  ok ${where}`);
      }
    }
  }

  console.log(`\nchecked ${checked} code artifacts`);
  if (!findings.length) { console.log("✓ every salient number traces to its concept's own prose"); return; }

  findings.sort((a, b) => b.total - a.total);
  console.log(`\n${findings.length} artifact(s) introduce numbers their concept never mentions:`);
  for (const f of findings) {
    console.log(`  ✗ ${f.where}: ${f.untraced.join(", ")}${f.total > 8 ? ` … +${f.total - 8}` : ""}`);
  }
  console.log(
    "\nAn artifact must not invent a figure. Take it from the concept's example,\n" +
    "or extend the example first — the two are read side by side on one pane.",
  );
  process.exit(1);
}

main();
