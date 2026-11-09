// Deterministic graders. Every response is in ORIGINAL indexes, so grading never depends on the
// order the options were displayed in.
import type { PItem, Response } from "./types";

export interface Result { score: number; correct: boolean }

const full = (score: number): Result => ({ score, correct: score >= 0.999 });

export function grade(item: PItem, r: Response): Result {
  switch (r.type) {
    case "mcq":
    case "code":
      return full(r.choice === item.answer ? 1 : 0);
    case "multi": {
      const want = new Set(item.answers ?? []);
      const got = new Set(r.choices);
      let tp = 0, fp = 0;
      got.forEach((c) => (want.has(c) ? tp++ : fp++));
      const exact = tp === want.size && fp === 0;
      return exact ? full(1) : { score: Math.max(0, (tp - fp) / Math.max(1, want.size)), correct: false };
    }
    case "order": {
      const n = item.steps?.length ?? 0;
      if (r.order.length !== n) return full(0);
      // Credit for every adjacent pair the learner kept in the right relative order.
      let ok = 0;
      for (let i = 0; i + 1 < n; i++) if (r.order[i] < r.order[i + 1] && r.order[i + 1] - r.order[i] === 1) ok++;
      const exact = r.order.every((v, i) => v === i);
      return exact ? full(1) : { score: n > 1 ? ok / (n - 1) : 0, correct: false };
    }
    case "match": {
      const n = item.pairs?.length ?? 0;
      const ok = r.map.filter((v, i) => v === i).length;
      return n && ok === n ? full(1) : { score: n ? ok / n : 0, correct: false };
    }
    case "numeric": {
      const a = Number(item.answer), tol = item.tolerance ?? 0.1;
      if (!Number.isFinite(r.value) || !Number.isFinite(a) || a === 0) return full(0);
      const rel = Math.abs(r.value - a) / Math.abs(a);
      return rel <= tol ? full(1) : { score: rel <= 2 * tol ? 0.5 : 0, correct: false };
    }
    case "diagram": {
      const blanks = item.blanks ?? [];
      const ok = blanks.filter((b) => r.fill[b.node] === b.label).length;
      return blanks.length && ok === blanks.length ? full(1) : { score: blanks.length ? ok / blanks.length : 0, correct: false };
    }
    case "recall":
      return { score: (r.self - 1) / 3, correct: r.self >= 3 };
  }
}

/** Parse "1,200", "1.2k", "3e5", "4 GB" → number. Returns NaN when it can't. */
export function parseNumber(input: string): number {
  const s = input.trim().toLowerCase().replace(/[\s_]/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
  const m = s.match(/^(-?\d*\.?\d+(?:e[+-]?\d+)?)(k|m|b|bn|t)?/);
  if (!m) return NaN;
  const mult: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, bn: 1e9, t: 1e12 };
  return parseFloat(m[1]) * (m[2] ? mult[m[2]] : 1);
}
