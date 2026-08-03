// Deterministic shuffling — the shared primitive behind every quiz option order.
//
// Why this module exists: the authored content has the correct answer first in
// almost every item (152 of 157 checkpoint items, 76 of 90 mid-lesson quiz
// items). That is natural for an author — you write the right answer, then the
// distractors — but it made every quiz in the app winnable by clicking option 1
// without reading. The assessment is the platform's only honest signal, so this
// isn't cosmetic: it was the difference between a gate and a formality.
//
// Two ways to fix it: re-order the authored JSON, or shuffle at render. Shuffling
// wins — it fixes all existing and all FUTURE content at once, and no author can
// reintroduce the bias.
//
// Hard constraint: `Math.random()` is forbidden project-wide because these views
// are statically exported and hydrated; a random order would differ between the
// server-rendered HTML and the client, breaking hydration and changing under the
// learner's cursor. So the order is a pure function of a stable string key
// (mulberry32 + Fisher-Yates), which means: same item → same order, every render,
// every device, no state to store.
//
// It is deliberately NOT a security measure — a determined learner can read the
// exported JSON. It removes an accidental tell, nothing more.

/** mulberry32 — small, fast, well-distributed PRNG from a 32-bit seed. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit string hash (FNV-1a). Same string → same seed, forever. */
export function seedFrom(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A permutation of 0..n-1, deterministic in `key`.
 * Returns index positions: `perm[i]` is the ORIGINAL index to render at slot i.
 */
export function seededPermutation(n: number, key: string): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return a;
  const rnd = mulberry32(seedFrom(key));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Shuffle a list of options for display, deterministically.
 *
 * Returns entries carrying the ORIGINAL index, because every caller needs it:
 * grading, `picked` state, and the per-option rationale all key off the authored
 * position. Callers must never assume display order equals authored order.
 */
export interface Shuffled<T> { option: T; originalIndex: number; }

export function shuffleOptions<T>(options: readonly T[], key: string): Shuffled<T>[] {
  return seededPermutation(options.length, key).map((originalIndex) => ({
    option: options[originalIndex],
    originalIndex,
  }));
}

/**
 * A display key for one quiz item. Quiz items in this content model have no id
 * of their own, so we build a stable one from the surrounding identifiers plus
 * the item's own stem — meaning an edited stem reshuffles (fine) but a stable
 * stem never does.
 */
export function itemKey(scope: string, index: number, stem: string): string {
  return `${scope}#${index}#${stem.slice(0, 64)}`;
}

/**
 * The display key for one checkpoint item on a given ATTEMPT.
 *
 * The attempt number is part of the key because without it `itemKey` is a pure
 * function of stable inputs, so every retry presented all 183 checkpoint items in
 * an identical order — and a failed attempt used to reveal the whole answer key,
 * making the gate memorisable in two passes.
 *
 * This lives here, rather than inline in `CheckpointPlayer`, so a test can assert
 * the key the component actually uses. The first version of that test rebuilt the
 * key itself, which meant reverting the component's attempt counter broke nothing:
 * a test that restates the implementation guards nothing.
 */
export function checkpointItemKey(checkpointId: string, attempt: number, index: number, stem: string): string {
  return itemKey(`${checkpointId}:a${attempt}`, index, stem);
}
