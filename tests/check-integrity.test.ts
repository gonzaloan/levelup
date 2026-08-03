// Can a learner who reads NOTHING pass the knowledge checks?
//
// `src/lib/shuffle.ts` was written because authored MCQ content puts the correct
// answer first in ~97% of items, which made every quiz clickable without reading.
// That fix was applied to MCQ option lists — and to exactly one of the four
// novel check players (`OrderPlayer`). The other three were never wired to it,
// and the authored answer keys for those three are overwhelmingly the identity
// permutation:
//
//   match      63 of 73 have pairs [[0,0],[1,1],[2,2],…]
//   cloze      58 of 61 have answers [0,1,2,…]
//   categorize 62 of 81 have items already sorted by bucket
//
// So the same defect class the project already fixed once was still live on three
// mechanics. These tests encode the zero-knowledge strategies a learner can
// execute against each player's UI and assert they now fail.
//
// They are written against the DISPLAY layer (`displayFor…`), not against the raw
// authored JSON, because the authored order is not what the learner sees. Testing
// the JSON would let a future refactor drop the shuffle and still pass.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CHECKS, gradeCheck, gradedChecksForConcepts, practiceChecksForLesson,
  type CheckResponse,
} from "@/lib/checks";
import { CHECKPOINTS as SPINE_CHECKPOINTS } from "@/lib/curriculum";
import { checkpointClearThreshold, checkpointMaxMisses } from "@/lib/scoring";
import { MAX_CHECKPOINT_ATTEMPTS } from "@/lib/store";
import { buildsForConcept } from "@/lib/build";
import { shuffleOptions, checkpointItemKey } from "@/lib/shuffle";
import { LESSONS } from "@/lib/lessons";
import {
  displayForCloze, displayForMatch, displayForCategorize, displayForOrder,
} from "@/lib/checkDisplay";
import type { CategorizeCheck, ClozeCheck, MatchCheck, OrderCheck } from "@/lib/types";

const cloze = CHECKS.filter((c): c is ClozeCheck => c.kind === "cloze");
const match = CHECKS.filter((c): c is MatchCheck => c.kind === "match");
const categorize = CHECKS.filter((c): c is CategorizeCheck => c.kind === "categorize");
const order = CHECKS.filter((c): c is OrderCheck => c.kind === "order");
const LESSON_IDS = LESSONS.map((l) => l.lessonId);

/** How many of `items` a strategy passes, as a count and a share. */
function exploitRate<T>(items: T[], attack: (item: T) => boolean) {
  const passed = items.filter(attack).length;
  return { passed, total: items.length, share: items.length ? passed / items.length : 0 };
}

describe("zero-knowledge exploits must not clear a check", () => {
  // ── Cloze: tap the bank left-to-right ──────────────────────────────────────
  // ClozePlayer auto-advances to the next empty blank, so tapping bank tokens in
  // display order fills blank i with display token i. With an identity key and no
  // shuffle, that is exactly correct.
  it("cloze: filling blanks from the bank in display order fails", () => {
    const r = exploitRate(cloze, (item) => {
      const d = displayForCloze(item);
      // The learner taps display slot i for blank i; the player records the
      // ORIGINAL bank index behind that slot.
      const response: CheckResponse = item.answers.map((_, blank) => d.bankOrder[blank] ?? -1);
      return gradeCheck(item, response);
    });
    expect(r.passed, `${r.passed}/${r.total} cloze checks fall to left-to-right tapping`).toBe(0);
  });

  // ── Match: link row i to row i, straight down ──────────────────────────────
  it("match: linking left row i to right row i fails", () => {
    const r = exploitRate(match, (item) => {
      const d = displayForMatch(item);
      const response = item.left.map((_, l) => {
        // Display row l on the left is authored index d.leftOrder[l]; the learner
        // links it to display row l on the right, i.e. authored d.rightOrder[l].
        const authoredLeft = d.leftOrder[l];
        const authoredRight = d.rightOrder[l];
        return [authoredLeft, authoredRight] as [number, number];
      });
      return gradeCheck(item, response);
    });
    expect(r.passed, `${r.passed}/${r.total} match checks fall to straight-down linking`).toBe(0);
  });

  // ── Categorize: drop the first half in bucket 0, the rest in bucket 1 ──────
  it("categorize: splitting the tray in display order fails", () => {
    const r = exploitRate(categorize, (item) => {
      const d = displayForCategorize(item);
      const n = item.items.length;
      const buckets = item.buckets.length;
      // Response is indexed by AUTHORED item order (gradeCheck compares against
      // item.items.map(bucket)), so map each display slot back.
      const response: number[] = new Array(n).fill(0);
      d.itemOrder.forEach((authoredIdx, displaySlot) => {
        response[authoredIdx] = Math.min(buckets - 1, Math.floor((displaySlot * buckets) / n));
      });
      return gradeCheck(item, response);
    });
    expect(r.passed, `${r.passed}/${r.total} categorize checks fall to an in-order tray split`).toBe(0);
  });

  // ── Order: submit the tiles exactly as presented ───────────────────────────
  // OrderPlayer already shuffled; this locks that it stays true.
  it("order: submitting the presented order without reordering fails", () => {
    const r = exploitRate(order, (item) => {
      const d = displayForOrder(item);
      return gradeCheck(item, d.itemOrder);
    });
    expect(r.passed, `${r.passed}/${r.total} order checks fall to submitting as-presented`).toBe(0);
  });
});

describe("the shuffle is real, deterministic, and lossless", () => {
  it("every display order is a true permutation of the authored indices", () => {
    const bad: string[] = [];
    const isPerm = (a: readonly number[], n: number) =>
      a.length === n && new Set(a).size === n && a.every((x) => Number.isInteger(x) && x >= 0 && x < n);

    for (const item of cloze) {
      const d = displayForCloze(item);
      if (!isPerm(d.bankOrder, item.bank.length)) bad.push(`${item.id} bankOrder`);
    }
    for (const item of match) {
      const d = displayForMatch(item);
      if (!isPerm(d.leftOrder, item.left.length)) bad.push(`${item.id} leftOrder`);
      if (!isPerm(d.rightOrder, item.right.length)) bad.push(`${item.id} rightOrder`);
    }
    for (const item of categorize) {
      const d = displayForCategorize(item);
      if (!isPerm(d.itemOrder, item.items.length)) bad.push(`${item.id} itemOrder`);
      if (!isPerm(d.bucketOrder, item.buckets.length)) bad.push(`${item.id} bucketOrder`);
    }
    for (const item of order) {
      const d = displayForOrder(item);
      if (!isPerm(d.itemOrder, item.items.length)) bad.push(`${item.id} itemOrder`);
    }
    expect(bad, `not permutations: ${bad.join(", ")}`).toEqual([]);
  });

  it("is stable across calls — SSR and hydration must agree", () => {
    for (const item of [...cloze.slice(0, 12), ...match.slice(0, 12)]) {
      if (item.kind === "cloze") {
        expect(displayForCloze(item).bankOrder).toEqual(displayForCloze(item).bankOrder);
      } else {
        expect(displayForMatch(item).rightOrder).toEqual(displayForMatch(item).rightOrder);
      }
    }
  });

  it("two items of the SAME length get different orders", () => {
    // If every item shared one permutation, a learner would learn it once.
    //
    // The first version of this collected order signatures across ALL match checks
    // and asserted more than one distinct value. That passes with a hardcoded
    // constant key: right columns come in lengths 3, 4 and 5, so one shared
    // permutation still yields three distinct `join(",")` strings. It was testing
    // that the corpus has mixed column lengths.
    //
    // Comparing WITHIN a length class is what the property actually needs.
    const byLength = new Map<number, string[]>();
    for (const m of match) {
      const n = m.right.length;
      if (!byLength.has(n)) byLength.set(n, []);
      byLength.get(n)!.push(displayForMatch(m).rightOrder.join(","));
    }
    const degenerate: string[] = [];
    for (const [n, sigs] of byLength) {
      if (sigs.length < 4) continue;                     // too few to conclude
      if (new Set(sigs).size < 2) degenerate.push(`n=${n} (${sigs.length} items, 1 order)`);
    }
    expect(degenerate, "every item of this length gets the identical order — the key is a constant").toEqual([]);
  });
});

describe("the authored corpus still carries the bias the shuffle exists to hide", () => {
  // Not a failure — a standing reminder. If someone deletes the shuffle, the
  // exploit tests above break, and this documents WHY they were written.
  it("records the identity-key share in the authored data", () => {
    const idMatch = match.filter((c) => c.pairs.every(([l, r], i) => l === i && r === i)).length;
    const idCloze = cloze.filter((c) => c.answers.every((a, i) => a === i)).length;
    const idCat = categorize.filter((c) => {
      const b = c.items.map((i) => i.bucket);
      return b.every((v, i) => i === 0 || b[i - 1] <= v);
    }).length;

    // Match and cloze are still high by nature — authors write the right answer first —
    // and that is tolerable because the DISPLAY layer hides it, which the tests above
    // assert. The identity key is only reachable through the rendered order.
    expect(idMatch / match.length).toBeGreaterThan(0.5);
    expect(idCloze / cloze.length).toBeGreaterThan(0.5);

    // CATEGORIZE IS DIFFERENT, and this assertion had it backwards.
    //
    // The blind sweep strategy never reads the tray, so shuffling the display cannot
    // protect a key whose buckets fall in a run — the exploit clears it outright. That made
    // the authored order a real exposure rather than a tolerable one, and 63 of 105 checks
    // were in that shape. `tools/fix-categorize-sweeps.cjs` reordered them.
    //
    // So the direction flips: a HIGH share here is now a defect, not a fact of authoring.
    // The residual 19% are keys that are merely non-descending, which is not a blind
    // pattern — `tests/exploit-family.test.ts` asserts the exploitable count is zero.
    expect(idCat / categorize.length,
      `${idCat}/${categorize.length} categorize keys are grouped in authored order — the ` +
      `sweep exploit ignores the display, so this may only go DOWN`).toBeLessThan(0.25);
  });
});

describe("the graded pool is held out from the practice pool", () => {
  // THE DEFECT: the lesson's practice stage took `checksForLesson(id).slice(0,2)`
  // and the checkpoint took `coversConcepts.flatMap(checksForConcept).slice(0,2)`.
  // Both walked the same array, so 66 of the 70 graded checks (94%) were the SAME
  // items the learner had just played formatively — with unlimited free retry and
  // the explanation printed. 32 of 35 checkpoints had every graded check pre-seen.
  // A gate made of puzzles you just solved with the answers visible is not a gate.
  const CHECKPOINTS = SPINE_CHECKPOINTS;

  it("no checkpoint grades an item its own lesson serves as practice", () => {
    const offenders: string[] = [];
    for (const cp of CHECKPOINTS) {
      const graded = gradedChecksForConcepts(cp.coversConcepts).slice(0, 2);
      const lessonId = `${cp.domainId}-${cp.afterLevel.toLowerCase()}`;
      const practice = new Set(practiceChecksForLesson(lessonId).slice(0, 4).map((c) => c.id));
      const dup = graded.filter((c) => practice.has(c.id));
      if (dup.length) offenders.push(`${cp.id}: ${dup.map((c) => c.id).join(", ")}`);
    }
    expect(offenders, `graded items already seen in practice: ${offenders.join(" | ")}`).toEqual([]);
  });

  it("every checkpoint still has at least one graded check", () => {
    // The split must not starve the gate: holding items back is only worth doing
    // if something is left to grade with.
    const empty = CHECKPOINTS.filter((cp) => gradedChecksForConcepts(cp.coversConcepts).length === 0);
    expect(empty.map((c) => c.id), "checkpoints left with no graded check").toEqual([]);
  });

  it("every lesson still has formative practice", () => {
    const empty = LESSON_IDS.filter((id) => practiceChecksForLesson(id).length === 0);
    expect(empty, "lessons left with no practice check").toEqual([]);
  });

  it("most authored checks are reachable by some learner", () => {
    // 294 of 368 authored checks were unreachable because both selectors took only
    // the first two. Authoring content nobody can reach is the most expensive kind
    // of waste, so this asserts a floor rather than a nice-to-have.
    const reachable = new Set<string>();
    for (const cp of CHECKPOINTS) {
      for (const c of gradedChecksForConcepts(cp.coversConcepts).slice(0, 2)) reachable.add(c.id);
    }
    for (const id of LESSON_IDS) {
      for (const c of practiceChecksForLesson(id).slice(0, 4)) reachable.add(c.id);
    }
    const share = reachable.size / CHECKS.length;
    expect(share, `only ${reachable.size} of ${CHECKS.length} checks are reachable`).toBeGreaterThan(0.5);
  });
});

describe("a retry is a different exam, not a recital", () => {
  // `itemKey(scope, index, stem)` was a pure function of stable inputs, so every
  // retry presented all 183 checkpoint items in an IDENTICAL order. Paired with a
  // reveal that used to paint the correct option green on a miss, that made the
  // whole 35-checkpoint gate memorisable in two passes: fail once to collect the
  // key, pass second time from memory.
  //
  // `CheckpointPlayer` now folds an attempt counter into the scope. This is a unit
  // test rather than a browser one on purpose: reaching the failure screen by
  // clicking requires completing the graded categorize/match/cloze steps appended
  // after the MCQs, and a harness that solves four mechanics wrongly-but-validly
  // tests the harness. The property is pure, so it is asserted exactly.
  const SPINE = SPINE_CHECKPOINTS;

  it("the component passes its attempt state into the shuffle key", () => {
    // WHAT THIS GUARDS, and why it reads source rather than behaviour.
    //
    // The test below proves `checkpointItemKey` produces a different order per
    // attempt. That is necessary and NOT sufficient: I verified by reverting
    // `CheckpointPlayer` to pass a literal `0` instead of its `attempt` state, and
    // every assertion in this file still passed. A pure test cannot observe a
    // component's arguments, so it cannot tell a working wiring from a pinned one.
    //
    // The behavioural half lives in `tests/visual/` where a browser can retry a
    // checkpoint. This static half catches the specific revert that slipped: a
    // literal in the attempt position.
    const src = readFileSync("src/components/CheckpointPlayer.tsx", "utf8");
    const call = /checkpointItemKey\(\s*checkpoint\.id\s*,\s*([^,]+),/.exec(src);
    expect(call, "CheckpointPlayer no longer calls checkpointItemKey").toBeTruthy();
    const attemptArg = (call?.[1] ?? "").trim();
    expect(attemptArg, "the attempt argument is a literal, so every retry repeats the same order")
      .toBe("attempt");
    // And the state it passes must actually advance on retry.
    expect(/setAttempt\(\s*\(a\)\s*=>\s*a\s*\+\s*1\s*\)/.test(src),
      "retry() does not advance the attempt counter").toBe(true);
  });

  it("bumping the attempt changes the option order for essentially every item", () => {
    let changed = 0, total = 0;
    for (const cp of SPINE) {
      cp.items.forEach((item, idx) => {
        total++;
        const a0 = shuffleOptions(item.options, checkpointItemKey(cp.id, 0, idx, item.stem.en))
          .map((o) => o.originalIndex).join(",");
        const a1 = shuffleOptions(item.options, checkpointItemKey(cp.id, 1, idx, item.stem.en))
          .map((o) => o.originalIndex).join(",");
        if (a0 !== a1) changed++;
      });
    }
    // Not 100%: a uniform shuffle of a 3- or 4-option list can coincide across two
    // seeds, and forcing a difference per item would be a worse trade than a
    // learner occasionally seeing one familiar arrangement. The bar is that a
    // memorised RUN is worthless, which needs most items to move, not all.
    expect(changed / total, `only ${changed}/${total} items reshuffle on retry`).toBeGreaterThan(0.6);
  });

  it("the same attempt is still stable — SSR and hydration must agree", () => {
    for (const cp of SPINE.slice(0, 8)) {
      cp.items.forEach((item, idx) => {
        const key = checkpointItemKey(cp.id, 2, idx, item.stem.en);
        expect(shuffleOptions(item.options, key).map((o) => o.originalIndex))
          .toEqual(shuffleOptions(item.options, key).map((o) => o.originalIndex));
      });
    }
  });

  it("the correct answer lands in every position at roughly chance rate", () => {
    // My first version of this test asserted that NO attempt renders the authored
    // order (which puts the key first in 178 of 178 checkpoint items). It reported
    // 194 violations — and that assertion was wrong. Measured: 27.2% of
    // attempt-instances put the key first, against ~25% expected by chance for a
    // 4-option shuffle. That is the shuffle working.
    //
    // Forcing it to zero would install a WORSE tell than the one being fixed:
    // "the first option is never correct" is a rule a learner can exploit in one
    // sitting. What matters is that position carries no information, so the test
    // asserts the distribution is near-uniform in BOTH directions.
    //
    // SCOPE, because this reads like it guards the attempt counter and does not:
    // removing the attempt from the key leaves this passing (the loop just
    // re-derives one order six times, and the distribution across items is
    // unchanged). That is fine — the property here is about POSITION, and the
    // attempt is guarded by the two tests above it. Recorded because a reviewer
    // reasonably read the `attempt` loop as the thing under test.
    const counts = [0, 0, 0, 0, 0, 0];
    let total = 0;
    for (const cp of SPINE) {
      cp.items.forEach((item, idx) => {
        const n = item.options.length;
        if (n < 3) return;
        for (let attempt = 0; attempt < 6; attempt++) {
          const order = shuffleOptions(item.options, checkpointItemKey(cp.id, attempt, idx, item.stem.en));
          const pos = order.findIndex((o) => o.option.correct);
          counts[pos]++;
          total++;
        }
      });
    }
    // Options are mostly 4-wide, so each slot should hold roughly a quarter. Allow
    // a generous band: the point is that no slot is empty and none dominates.
    const used = counts.filter((c) => c > 0).length;
    expect(used, "the correct answer never reaches some positions").toBeGreaterThanOrEqual(3);
    const maxShare = Math.max(...counts) / total;
    const minShare = Math.min(...counts.filter((c) => c > 0)) / total;
    expect(maxShare, `one position holds ${(100 * maxShare).toFixed(1)}% of correct answers`).toBeLessThan(0.42);
    expect(minShare, `one position holds only ${(100 * minShare).toFixed(1)}%`).toBeGreaterThan(0.05);
  });
});

describe("exploit strategies beyond the four documented ones", () => {
  // The four guarded exploits are the ones each mechanic's UI makes natural. A
  // learner who has noticed the guard will try the next-most-obvious thing, so
  // these measure the rest of the space. None needs to be zero — a strategy that
  // happens to be right on a few items is chance, not a hole — but a strategy that
  // works often would be one.
  //
  // A note on what makes a strategy REAL, because my own first attack script got
  // this wrong and reported a 94/94 break that does not exist. `gradeCheck` for
  // `order` compares the response to [0,1,…,n-1], and the response is expressed in
  // AUTHORED indices. So "sort the display order array ascending" trivially yields
  // the answer for any permutation — but a learner cannot execute it, because the
  // authored index is not observable: `OrderPlayer` renders the display position
  // (`pos + 1`) and the label, and the authored index appears only as a React
  // `key`, which does not reach the DOM. A strategy is only real if it can be
  // carried out from what is on screen.
  const CEILING = 0.15;

  it("no alternative strategy works on more than 15% of its mechanic", () => {
    const results: { name: string; passed: number; total: number }[] = [];

    // match: link the diagonal backwards.
    results.push({
      name: "match: reverse diagonal",
      total: match.length,
      passed: match.filter((item) => {
        const d = displayForMatch(item);
        const n = item.left.length;
        return gradeCheck(item, d.leftOrder.map((al, row) => [al, d.rightOrder[n - 1 - row]] as [number, number]));
      }).length,
    });

    // categorize: everything into one bucket, and alternating buckets.
    for (const label of ["all-in-first", "alternating", "reverse-split"] as const) {
      results.push({
        name: `categorize: ${label}`,
        total: categorize.length,
        passed: categorize.filter((item) => {
          const d = displayForCategorize(item);
          const n = item.items.length;
          const b = item.buckets.length;
          const r = new Array(n).fill(0);
          d.itemOrder.forEach((authored, slot) => {
            r[authored] =
              label === "all-in-first" ? d.bucketOrder[0]
              : label === "alternating" ? d.bucketOrder[slot % b]
              : Math.min(b - 1, Math.floor(((n - 1 - slot) * b) / n));
          });
          return gradeCheck(item, r);
        }).length,
      });
    }

    // cloze: fill the blanks right to left.
    results.push({
      name: "cloze: right-to-left",
      total: cloze.length,
      passed: cloze.filter((item) => {
        const d = displayForCloze(item);
        const nb = item.answers.length;
        return gradeCheck(item, item.answers.map((_, b) => d.bankOrder[nb - 1 - b] ?? -1));
      }).length,
    });

    // order: reverse the presented order, and rotate it either way.
    for (const label of ["reversed", "rotate-left", "rotate-right"] as const) {
      results.push({
        name: `order: ${label}`,
        total: order.length,
        passed: order.filter((item) => {
          const o = [...displayForOrder(item).itemOrder];
          if (label === "reversed") o.reverse();
          else if (label === "rotate-left") o.push(o.shift()!);
          else o.unshift(o.pop()!);
          return gradeCheck(item, o);
        }).length,
      });
    }

    const over = results.filter((r) => r.passed / r.total > CEILING);
    expect(
      over.map((r) => `${r.name} ${r.passed}/${r.total}`),
      `strategies above ${CEILING * 100}%: these are exploitable patterns, not chance`,
    ).toEqual([]);
  });

  it("the authored index is not recoverable from what an order tile renders", () => {
    // The guard above only holds because a learner cannot see which authored index
    // a tile carries. If `OrderPlayer` ever renders it — as a data attribute, an
    // aria-label, or visible text — every order check becomes trivially solvable
    // by sorting. This asserts the component does not expose it.
    const src = readFileSync("src/components/checks/OrderPlayer.tsx", "utf8");
    const renderBody = src.slice(src.indexOf("return ("));
    // `key={itemIdx}` is fine: React keys never reach the DOM.
    const withoutKeys = renderBody.replace(/key=\{[^}]*\}/g, "");
    const leaks = [
      /data-[a-z-]+=\{\s*itemIdx/,          // a data attribute carrying it
      /aria-[a-z-]+=\{[^}]*itemIdx/,        // an aria attribute carrying it
      /\{\s*itemIdx\s*\+\s*1\s*\}/,         // rendered as a 1-based number
      /\{\s*itemIdx\s*\}(?!\s*\])/,         // rendered bare
    ].filter((re) => re.test(withoutKeys));
    expect(leaks.map(String), "OrderPlayer exposes the authored index").toEqual([]);
  });
});

describe("a zero-knowledge learner cannot clear a checkpoint", () => {
  // THE DOMINANT ATTACK is not positional, and shuffling cannot touch it: options
  // are identified by their TEXT, so a learner remembers what they ruled out even
  // when it moves. On attempt J they choose among n-(J-1) remaining texts.
  //
  // Measured before the fix: 23 of 35 checkpoints exceeded a 5% clear rate somewhere
  // in attempts 1-6, worst 30.6%. Three things bound it — `MAX_CHECKPOINT_ATTEMPTS`,
  // PERSISTED so a reload cannot reset it, and the 0.85 floor that `(n-1)/n` undercut
  // on every short checkpoint.
  //
  // THIS TEST IMPORTS the functions the component calls, and feeds them TOTAL STEPS.
  // Its first version redeclared its own `clearThreshold` and passed
  // `cp.items.length`, which differs from `totalSteps` for all 35 checkpoints — so
  // deleting the 0.85 floor left it passing. A test that restates the implementation
  // measures the restatement.
  const gradedFor = (cp: (typeof SPINE_CHECKPOINTS)[number]) => gradedChecksForConcepts(cp.coversConcepts).slice(0, 2);
  const totalStepsOf = (cp: (typeof SPINE_CHECKPOINTS)[number]) =>
    cp.items.length + gradedFor(cp).length + (buildsForConcept ? countBuild(cp) : 0);
  function countBuild(cp: (typeof SPINE_CHECKPOINTS)[number]): number {
    return cp.coversConcepts.some((s) => buildsForConcept(s).length > 0) ? 1 : 0;
  }

  /** P(at least total-k correct) for independent per-item probabilities. */
  function pAtMostKMisses(ps: number[], k: number): number {
    let dp = [1];
    for (const p of ps) {
      const next = new Array(dp.length + 1).fill(0);
      for (let i = 0; i < dp.length; i++) { next[i] += dp[i] * (1 - p); next[i + 1] += dp[i] * p; }
      dp = next;
    }
    let s = 0;
    for (let c = ps.length - k; c <= ps.length; c++) s += dp[c] ?? 0;
    return s;
  }

  it("stays under 8% on every checkpoint, across every allowed attempt", () => {
    const worst: string[] = [];
    for (const cp of SPINE_CHECKPOINTS) {
      const total = totalStepsOf(cp);
      const maxMiss = checkpointMaxMisses(total);
      for (let attempt = 1; attempt <= MAX_CHECKPOINT_ATTEMPTS; attempt++) {
        // Elimination on the MCQs; the graded checks and build are blind, and are
        // modelled generously at 1/6 so this bound cannot be met by their weakness.
        const ps = [
          ...cp.items.map((it) => 1 / Math.max(1, it.options.length - (attempt - 1))),
          ...new Array(total - cp.items.length).fill(1 / 6),
        ];
        const p = pAtMostKMisses(ps, maxMiss);
        if (p > 0.08) worst.push(`${cp.id} a${attempt} ${(100 * p).toFixed(1)}%`);
      }
    }
    // 8%, not 5%: the residual is `chk-technical-depth-l7` — 4 items of 3 options, so
    // on attempt 2 that is a coin flip per item with no miss allowed. No threshold
    // fixes a checkpoint that short; more items does. The bar catches a REGRESSION
    // without pretending the floor is where it should be.
    expect(worst, "a checkpoint became guessable").toEqual([]);
  });

  it("the gate honours the 0.85 threshold store.ts documents, at TOTAL steps", () => {
    // 9 of 35 used to clear below it, because (n-1)/n is 0.75 at 4 steps.
    const below = SPINE_CHECKPOINTS
      .map((cp) => ({ id: cp.id, t: checkpointClearThreshold(totalStepsOf(cp)) }))
      .filter((x) => x.t < 0.85);
    expect(below.map((b) => `${b.id} ${b.t}`), "a checkpoint clears below 0.85").toEqual([]);
  });

  it("the attempt cap is PERSISTED, not component state", () => {
    // It was `useState(0)`, so an F5 — or the link from /practice — handed out another
    // independently-scoring attempt, and recordCheckpoint keeps the max score. Within
    // six reloads 28 of 35 checkpoints cleared above 5% and five above 95%.
    const store = readFileSync("src/lib/store.ts", "utf8");
    expect(store, "Progress does not persist per-checkpoint attempts").toMatch(/checkpointAttempts:\s*Record<string, number>/);
    expect(store, "recordCheckpoint does not refuse to score past the cap").toMatch(/const overCap = spent >= maxAttempts/);
    expect(store, "a run past the cap still writes a score").toMatch(/checkpointScores: overCap/);

    const player = readFileSync("src/components/CheckpointPlayer.tsx", "utf8");
    // Two separate assertions rather than one multi-line regex: the seed must come
    // from the store, and it must not be a bare `useState(0)`.
    expect(player, "the player does not seed its attempt from the store")
      .toMatch(/checkpointAttemptsSpent\(checkpoint\.id\)/);
    expect(player, "the attempt is still a plain useState(0)")
      .not.toMatch(/const \[attempt, setAttempt\] = useState\(0\)/);

    const backup = readFileSync("src/lib/backup.ts", "utf8");
    expect(backup, "a backup round-trip resets the cap").toMatch(/checkpointAttempts: numRecord/);
  });

  it("the component consumes the shared threshold rather than its own copy", () => {
    const player = readFileSync("src/components/CheckpointPlayer.tsx", "utf8");
    expect(player, "CheckpointPlayer declares its own threshold again").not.toMatch(/function clearThreshold/);
    expect(player).toMatch(/checkpointClearThreshold\(totalSteps\)/);
    expect(player, "the gate label is not derived from the shared miss budget")
      .toMatch(/checkpointMaxMisses\(totalSteps\)/);
  });
});
