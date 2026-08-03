// Display order for the four novel check mechanics.
//
// WHY THIS MODULE EXISTS
// `shuffle.ts` explains the original defect: authored content puts the correct
// answer first, so an unshuffled quiz is winnable by clicking option 1. That was
// fixed for MCQ options — and for exactly one of the four check players
// (`OrderPlayer`, which shuffled its own tiles inline).
//
// The other three shipped with no shuffle at all, and their authored answer keys
// are overwhelmingly the identity permutation:
//
//   match       63 of 73 have pairs [[0,0],[1,1],[2,2],…]
//   cloze       58 of 61 have answers [0,1,2,…]
//   categorize  62 of 81 have items already sorted by bucket
//
// So three of the four mechanics could be cleared by pure positional play: link
// left row i to right row i, tap bank tokens left to right (ClozePlayer
// auto-advances, so token i lands in blank i), drop the first half of the tray in
// the first bucket. 60 of these checks are appended as GRADED steps to
// checkpoints, so this was not cosmetic.
//
// THE CONTRACT EVERY CALLER MUST HONOUR
// These functions return ORDERS: arrays of authored indices, where `order[i]` is
// the authored index to render at display slot `i`. A player renders in display
// order and MUST map back to the authored index before emitting a response,
// because `gradeCheck` compares against the authored key. Never grade, store or
// compare a display position.
//
// Determinism is mandatory (see shuffle.ts): these views are statically exported
// and hydrated, so the order is a pure function of the check's stable `id`.
// `Math.random()` would break hydration and change under the learner's cursor.
import { seededPermutation } from "./shuffle";
import type { CategorizeCheck, ClozeCheck, MatchCheck, OrderCheck } from "./types";

/** An authored-index order: `order[i]` is what to render at display slot i. */
export type DisplayOrder = number[];

/**
 * Attempt number, folded into every key.
 *
 * `CheckpointPlayer` learned this lesson for MCQ options and this module did not:
 * the display functions keyed on `item.id` alone, so all 70 graded checks presented
 * an IDENTICAL order on every attempt. Each player also marks every element ok/bad
 * on reveal, so a learner gets a per-element feedback vector against a fixed
 * layout — a Mastermind board. An exact consistency-filter solver clears categorize
 * in 2-3 attempts and cloze in 3-7, and retries are unlimited, so every checkpoint
 * fell with probability 1.0 by attempt 4.
 *
 * Defaults to 0 so a formative caller that does not track attempts is unchanged.
 */
export type Attempt = number;

const keyed = (id: string, part: string, attempt: Attempt) => `${id}:${part}:a${attempt}`;

/**
 * A permutation that is not the identity, and that does not leave the check
 * answerable by positional play.
 *
 * Shuffling alone is not enough. A seeded shuffle is uniform, so on a short list
 * it lands on the giveaway order by chance: with the shuffle in place but no
 * `unsafe` predicate, 11 of 233 checks were still cleared by pure positional play
 * (7 match, 3 categorize, 1 cloze) — because for those items the seed happened to
 * produce an order under which "row i to row i" was correct anyway.
 *
 * So the caller passes `unsafe(order)`: does THIS display order still hand the
 * answer to a learner who reads nothing? We walk deterministic re-keys until the
 * answer is no. Bounded, and the fallback is a rotation, so this always
 * terminates and always returns a real permutation.
 */
function safePerm(n: number, key: string, unsafe?: (order: DisplayOrder) => boolean): DisplayOrder {
  if (n < 2) return seededPermutation(n, key);
  const isIdentity = (o: DisplayOrder) => o.every((v, i) => v === i);
  const bad = (o: DisplayOrder) => isIdentity(o) || (unsafe ? unsafe(o) : false);

  let order = seededPermutation(n, key);
  for (let salt = 1; salt <= 24 && bad(order); salt++) {
    order = seededPermutation(n, `${key}#${salt}`);
  }
  // Exhausted the re-keys: rotate until it is acceptable. For n >= 2 at least one
  // rotation is not the identity, and rotations cover a different family of
  // orders than the PRNG, so this is a genuine second attempt rather than a
  // repeat of the same draw.
  for (let shift = 1; shift < n && bad(order); shift++) {
    order = Array.from({ length: n }, (_, i) => (i + shift) % n);
  }
  return order;
}

const perm = (n: number, key: string, unsafe?: (o: DisplayOrder) => boolean): DisplayOrder =>
  safePerm(n, key, unsafe);

// ── Cloze ────────────────────────────────────────────────────────────────────
// Only the BANK is shuffled. `segments` are prose in reading order and must never
// move; shuffling them would scramble the sentence.
export interface ClozeDisplay { bankOrder: DisplayOrder }

export function displayForCloze(item: ClozeCheck, attempt: Attempt = 0): ClozeDisplay {
  // The exploit: tap bank tokens left to right. ClozePlayer auto-advances to the
  // next empty blank, so display token i lands in blank i. Reject any order under
  // which that is the authored key.
  // Left-to-right is the natural exploit; right-to-left cleared 8 of 80 and a
  // rotated bank 6 of 80, so the guard covers the family the same way match does.
  const nb = item.answers.length;
  const unsafe = (o: DisplayOrder) => {
    const fills: ((blank: number) => number)[] = [
      (b) => o[b],                       // tap the bank left to right
      (b) => o[nb - 1 - b],              // fill blanks right to left
    ];
    for (let k = 1; k < o.length; k++) fills.push((b) => o[(b + k) % o.length]); // rotated
    return fills.some((at) => item.answers.every((a, b) => at(b) === a));
  };
  return { bankOrder: perm(item.bank.length, keyed(item.id, "bank", attempt), unsafe) };
}

// ── Match ────────────────────────────────────────────────────────────────────
// Both columns shuffle, with different keys. Shuffling only one column would
// still leave "row i to row i" correct for some items; shuffling both with the
// same key would preserve the diagonal exactly.
export interface MatchDisplay { leftOrder: DisplayOrder; rightOrder: DisplayOrder }

export function displayForMatch(item: MatchCheck, attempt: Attempt = 0): MatchDisplay {
  const want = new Map(item.pairs.map(([l, r]) => [l, r]));
  const leftOrder = perm(item.left.length, keyed(item.id, "left", attempt));
  // Reject the whole FAMILY of blind link patterns, not just the straight diagonal.
  //
  // Guarding only "row i to row i" left its neighbours open: linking row i to row
  // (i+1) cleared 11 of 93, and some fixed pattern from the rotations-plus-reverse
  // family cleared 28 of 93 (30%) — 14 of the 24 3x3 matches. A learner who notices
  // one guard tries the next offset, so the guard has to cover the family.
  // Measured: widening it drops that to 0 of 93, and it is satisfiable for every
  // item (0 fell back to the rotation escape hatch).
  const unsafe = (right: DisplayOrder) => {
    const patterns: ((row: number) => number)[] = [];
    for (let k = 0; k < right.length; k++) patterns.push((row) => right[(row + k) % right.length]);
    patterns.push((row) => right[right.length - 1 - row]);  // reverse diagonal
    return patterns.some((at) => leftOrder.every((authoredLeft, row) => want.get(authoredLeft) === at(row)));
  };
  return { leftOrder, rightOrder: perm(item.right.length, keyed(item.id, "right", attempt), unsafe) };
}

// ── Categorize ───────────────────────────────────────────────────────────────
// The tray shuffles so the items no longer arrive grouped by bucket. The buckets
// shuffle too: with a fixed bucket order, an author's habit of writing the
// "good" bucket first is its own tell.
export interface CategorizeDisplay { itemOrder: DisplayOrder; bucketOrder: DisplayOrder }

export function displayForCategorize(item: CategorizeCheck, attempt: Attempt = 0): CategorizeDisplay {
  const n = item.items.length;
  const buckets = item.buckets.length;

  // The exploit: sweep the tray in display order, dropping the first n/buckets chips in the
  // first bucket ON SCREEN and so on. Reject any tray order under which a blind rule is
  // correct.
  //
  // THE RULES ARE EVALUATED IN SCREEN SPACE, and that is the correction that matters. A
  // learner drops a chip into a bucket POSITION; `bucketOrder` maps that position to an
  // authored bucket. The first version of this guard compared a rule's output directly
  // against `item.items[i].bucket` — authored numbers — so "alternate left/right on screen"
  // was invisible to it. Measured end to end, blind rules cleared 6 of 105 at attempt 0 and
  // 14 at attempt 1, while this guard AND a content-side audit both reported zero. Both were
  // computing in the wrong coordinate space, which is why they agreed.
  //
  // Every phase of the alternating rule is rejected, not only phase 0: once the bucket order
  // is in play, phase 0 and phase 1 are different attacks.
  const strategies: ((slot: number) => number)[] = [
    (slot) => Math.min(buckets - 1, Math.floor((slot * buckets) / n)),            // even sweep
    (slot) => Math.min(buckets - 1, Math.floor(((n - 1 - slot) * buckets) / n)),  // reversed sweep
  ];
  for (let phase = 0; phase < buckets; phase++) {
    strategies.push((slot) => (slot + phase) % buckets);                          // alternating, any phase
  }
  for (let only = 0; only < buckets; only++) strategies.push(() => only);         // all in one bucket

  // Drawn FIRST, because the tray guard has to know it.
  //
  // `safePerm` is deliberately not used: it bans the identity, and with two buckets that
  // leaves exactly one permutation — so 97 of 97 two-bucket checks received the same forced
  // [1,0] on every attempt. A constant is not a shuffle, it is a rename: the author's first
  // bucket simply becomes the second one, always. The bucket LABELS are on screen, so their
  // order leaks nothing by itself, and allowing the identity restores a real coin flip.
  const bucketOrder = seededPermutation(buckets, keyed(item.id, "buckets", attempt));

  // BOTH coordinate spaces, because a learner can act in either.
  //
  // Screen space is what a chip-dropping learner produces: "the leftmost bucket on screen"
  // is authored bucket `bucketOrder[0]`. Authored space is what a learner produces by
  // reading the bucket LABELS and picking the first-authored one — the labels are visible,
  // so that is a real strategy too.
  //
  // Guarding only screen space is what my first correction did, and it traded one family
  // for the other: 12 end-to-end clears appeared in authored space that had not been there
  // before. The two are the same attack expressed in different terms, so the guard has to
  // reject a tray order under which EITHER reading is the key.
  const unsafe = (o: DisplayOrder) =>
    strategies.some((at) =>
      o.every((authoredIdx, slot) => item.items[authoredIdx].bucket === bucketOrder[at(slot)]) ||
      o.every((authoredIdx, slot) => item.items[authoredIdx].bucket === at(slot)));

  return { itemOrder: perm(n, keyed(item.id, "items", attempt), unsafe), bucketOrder };
}

// ── Order ────────────────────────────────────────────────────────────────────
// The correct answer is the authored array order, so the presented order must not
// be it. This centralizes what `OrderPlayer` did inline.
export interface OrderDisplay { itemOrder: DisplayOrder }

export function displayForOrder(item: OrderCheck, attempt: Attempt = 0): OrderDisplay {
  // The correct answer IS the authored order, so "submit as presented" is exactly
  // the identity case `safePerm` already rejects. Stated explicitly so the intent
  // survives a refactor.
  // Submitting as presented is the identity case. Reversing cleared 4 of 94 and
  // rotating 7 of 94, so the family is rejected together.
  const unsafe = (o: DisplayOrder) => {
    const n = o.length;
    if (o.every((v, i) => v === i)) return true;                       // as presented
    if (o.every((v, i) => v === n - 1 - i)) return true;               // reversed
    for (let k = 1; k < n; k++) {
      if (o.every((v, i) => v === (i + k) % n)) return true;           // rotated
    }
    return false;
  };
  return { itemOrder: perm(item.items.length, keyed(item.id, "tiles", attempt), unsafe) };
}
