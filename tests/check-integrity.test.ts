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
import { CHECKS, gradeCheck, type CheckResponse } from "@/lib/checks";
import {
  displayForCloze, displayForMatch, displayForCategorize, displayForOrder,
} from "@/lib/checkDisplay";
import type { CategorizeCheck, ClozeCheck, MatchCheck, OrderCheck } from "@/lib/types";

const cloze = CHECKS.filter((c): c is ClozeCheck => c.kind === "cloze");
const match = CHECKS.filter((c): c is MatchCheck => c.kind === "match");
const categorize = CHECKS.filter((c): c is CategorizeCheck => c.kind === "categorize");
const order = CHECKS.filter((c): c is OrderCheck => c.kind === "order");

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

  it("different items get different orders — the key is not a constant", () => {
    // If every item shared one permutation, a learner would learn it once.
    const sigs = new Set(match.filter((m) => m.right.length >= 4).map((m) => displayForMatch(m).rightOrder.join(",")));
    expect(sigs.size).toBeGreaterThan(1);
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
    // These are high by nature — authors write the right answer first. The point
    // is that the DISPLAY layer must not expose it, which the tests above assert.
    expect(idMatch / match.length).toBeGreaterThan(0.5);
    expect(idCloze / cloze.length).toBeGreaterThan(0.5);
    expect(idCat / categorize.length).toBeGreaterThan(0.5);
  });
});
