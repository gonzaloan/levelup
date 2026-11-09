// Seeded randomness: the same item + attempt always shows the same order (reproducible, testable),
// a new attempt shows a new one.
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates with a seeded PRNG. Returns a new array. */
export function shuffle<T>(arr: readonly T[], seed: string): T[] {
  const out = [...arr];
  const r = mulberry32(hashString(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A permutation of 0..n-1 that is never the identity when n > 1 (so "leave it as is" is never right). */
export function derange(n: number, seed: string): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let k = 0; k < 8; k++) {
    const p = shuffle(idx, `${seed}#${k}`);
    if (n < 2 || p.some((v, i) => v !== i)) return p;
  }
  return [...idx.slice(1), idx[0]];
}
