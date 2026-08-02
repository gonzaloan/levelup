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

export function displayForCloze(item: ClozeCheck): ClozeDisplay {
  // The exploit: tap bank tokens left to right. ClozePlayer auto-advances to the
  // next empty blank, so display token i lands in blank i. Reject any order under
  // which that is the authored key.
  const unsafe = (o: DisplayOrder) => item.answers.every((a, blank) => o[blank] === a);
  return { bankOrder: perm(item.bank.length, `${item.id}:bank`, unsafe) };
}

// ── Match ────────────────────────────────────────────────────────────────────
// Both columns shuffle, with different keys. Shuffling only one column would
// still leave "row i to row i" correct for some items; shuffling both with the
// same key would preserve the diagonal exactly.
export interface MatchDisplay { leftOrder: DisplayOrder; rightOrder: DisplayOrder }

export function displayForMatch(item: MatchCheck): MatchDisplay {
  const want = new Map(item.pairs.map(([l, r]) => [l, r]));
  const leftOrder = perm(item.left.length, `${item.id}:left`);
  // The exploit: link left display row i to right display row i, straight down.
  // Reject any right-hand order that makes every one of those links correct.
  const unsafe = (right: DisplayOrder) =>
    leftOrder.every((authoredLeft, row) => want.get(authoredLeft) === right[row]);
  return { leftOrder, rightOrder: perm(item.right.length, `${item.id}:right`, unsafe) };
}

// ── Categorize ───────────────────────────────────────────────────────────────
// The tray shuffles so the items no longer arrive grouped by bucket. The buckets
// shuffle too: with a fixed bucket order, an author's habit of writing the
// "good" bucket first is its own tell.
export interface CategorizeDisplay { itemOrder: DisplayOrder; bucketOrder: DisplayOrder }

export function displayForCategorize(item: CategorizeCheck): CategorizeDisplay {
  const n = item.items.length;
  const buckets = item.buckets.length;
  // The exploit: sweep the tray in display order, dropping the first n/buckets
  // chips in the first bucket and so on. Reject any tray order under which that
  // blind split is correct.
  const unsafe = (o: DisplayOrder) =>
    o.every((authoredIdx, slot) =>
      item.items[authoredIdx].bucket === Math.min(buckets - 1, Math.floor((slot * buckets) / n)));
  return {
    itemOrder: perm(n, `${item.id}:items`, unsafe),
    bucketOrder: perm(buckets, `${item.id}:buckets`),
  };
}

// ── Order ────────────────────────────────────────────────────────────────────
// The correct answer is the authored array order, so the presented order must not
// be it. This centralizes what `OrderPlayer` did inline.
export interface OrderDisplay { itemOrder: DisplayOrder }

export function displayForOrder(item: OrderCheck): OrderDisplay {
  // The correct answer IS the authored order, so "submit as presented" is exactly
  // the identity case `safePerm` already rejects. Stated explicitly so the intent
  // survives a refactor.
  const unsafe = (o: DisplayOrder) => o.every((v, i) => v === i);
  return { itemOrder: perm(item.items.length, `${item.id}:tiles`, unsafe) };
}
