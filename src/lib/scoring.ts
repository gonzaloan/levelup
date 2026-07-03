// The credibility core. Fully client-side, deterministic, no LLM required.
//
// Design decisions (research/04-brief-amendments-v2.md):
//  §B1 — report one of 3 honest bands per axis, mapped to a level RANGE.
//  §B2 — explicit fusion rule: composite = 0.5·k + 0.35·s + 0.15·c.
//  §B3 — measurement uncertainty is first-class: per-axis SEM, provisional flag.
//  §B4 — confident-wrong cap requires ≥2 corroborating signals.
//  §B5 — calibration gap only surfaced when it exceeds the error band.
//  §C2 — theta is a MAP (penalized) estimate, not "Bayesian-prior MLE".
import type { AxisId, Band } from "./axes";
import type { Response, AxisResult, Confidence, Difficulty } from "./types";

// ── 1PL / Rasch response model ──────────────────────────────────────────
export function pCorrect(theta: number, b: number): number {
  return 1 / (1 + Math.exp(-(theta - b)));
}

/**
 * MAP (maximum a posteriori) ability estimate: penalized 1PL log-likelihood
 * with a N(0, PRIOR_SD²) prior. The prior stabilizes all-right / all-wrong
 * response vectors, which a plain MLE would send to ±∞ (§C2).
 * Solved by a short Newton–Raphson with a grid fallback.
 */
const PRIOR_SD = 1.4;
export function estimateTheta(items: { b: Difficulty; correct: boolean }[]): {
  theta: number;
  sem: number;
} {
  if (items.length === 0) return { theta: 0, sem: 999 };
  let theta = 0;
  for (let iter = 0; iter < 30; iter++) {
    let g = -theta / (PRIOR_SD * PRIOR_SD); // prior gradient
    let h = -1 / (PRIOR_SD * PRIOR_SD); // prior curvature
    for (const it of items) {
      const p = pCorrect(theta, it.b);
      g += (it.correct ? 1 : 0) - p;
      h -= p * (1 - p);
    }
    if (Math.abs(h) < 1e-9) break;
    const step = g / h;
    theta -= step;
    if (!isFinite(theta)) {
      theta = 0;
      break;
    }
    if (Math.abs(step) < 1e-6) break;
  }
  // Clamp to a sane logit range and compute Fisher-information SEM.
  theta = Math.max(-3.5, Math.min(3.5, theta));
  let info = 1 / (PRIOR_SD * PRIOR_SD);
  for (const it of items) {
    const p = pCorrect(theta, it.b);
    info += p * (1 - p);
  }
  const sem = 1 / Math.sqrt(info);
  return { theta, sem };
}

// ── Certainty-Based Marking (CBM) — proper scoring rule ──────────────────
const CBM: Record<Confidence, { right: number; wrong: number; max: number }> = {
  low: { right: 1, wrong: 0, max: 1 },
  mid: { right: 2, wrong: -2, max: 2 },
  high: { right: 3, wrong: -6, max: 3 },
};

export function cbmScore(responses: Response[]): number {
  // Normalized 0..1 calibration score. Each response is scored on the CBM
  // proper-scoring rule and rescaled against FIXED bounds (best = high+correct
  // = +3, worst = high+wrong = -6) so the score is comparable across responders
  // and confident-correct strictly beats guess-correct (Gardner-Medwin CBM).
  if (responses.length === 0) return 0.5;
  const BEST = 3;
  const WORST = -6;
  let got = 0;
  for (const r of responses) {
    const c = CBM[r.confidence];
    got += r.correct ? c.right : c.wrong;
  }
  const perItem = got / responses.length;
  return clamp01((perItem - WORST) / (BEST - WORST));
}

// ── SJT partial-credit ratio ────────────────────────────────────────────
export function sjtScore(
  picks: { score: number; maxScore: number; minScore?: number }[]
): number | null {
  if (picks.length === 0) return null;
  let got = 0;
  let max = 0;
  let min = 0;
  for (const p of picks) {
    got += p.score;
    max += p.maxScore;
    // Worst achievable on this item. When callers pass a per-item floor we use
    // it; otherwise fall back to the harmful-option convention (−2).
    min += typeof p.minScore === "number" ? p.minScore : -2;
  }
  if (max - min === 0) return 0.5;
  return clamp01((got - min) / (max - min));
}

// ── Fusion → composite → band (§B2) ──────────────────────────────────────
const W_KNOWLEDGE = 0.5;
const W_SJT = 0.35;
const W_CBM = 0.15;

// theta (roughly -3.5..3.5) → 0..1 via logistic squash centered at the L4/L5 line.
export function thetaToUnit(theta: number): number {
  return clamp01(1 / (1 + Math.exp(-(theta - 0) * 0.9)));
}

export function composite(k: number, s: number | null, c: number): number {
  // If no SJT on this axis, redistribute its weight onto knowledge.
  if (s === null) {
    const wk = W_KNOWLEDGE + W_SJT;
    return clamp01(wk * k + W_CBM * c);
  }
  return clamp01(W_KNOWLEDGE * k + W_SJT * s + W_CBM * c);
}

const CUT_DEVELOPING = 0.4;
const CUT_STRONG = 0.7;
export function toBand(comp: number): Band {
  if (comp < CUT_DEVELOPING) return "developing";
  if (comp > CUT_STRONG) return "strong";
  return "solid";
}

const HIGH_SEM = 0.85; // above this, placement is flagged provisional (§B3)

// ── Per-axis result assembly ─────────────────────────────────────────────
export function scoreAxis(
  axis: AxisId,
  objective: Response[],
  sjtPicks: { score: number; maxScore: number }[],
  selfRating: number | undefined, // 0..1 absolute, behavior-anchored
  misconceptionsByCw: Map<string, string> // itemId -> misconception slug
): AxisResult {
  const est = estimateTheta(objective.map((r) => ({ b: r.difficulty, correct: r.correct })));
  const k = thetaToUnit(est.theta);
  const s = sjtScore(sjtPicks);
  const c = cbmScore(objective);
  const comp = composite(k, s, c);

  // Confident-wrong cap: only with ≥2 corroborating signals (§B4).
  const cw = objective.filter((r) => !r.correct && r.confidence === "high");
  const lowObjective = k < 0.45;
  const corroborating = cw.length + (lowObjective ? 1 : 0);
  let band = toBand(comp);
  if (cw.length >= 1 && corroborating >= 2 && band === "strong") {
    band = "solid"; // lower by at most one
  }

  const provisional = est.sem > HIGH_SEM || objective.length < 5;

  // Calibration gap only when it exceeds the combined error band (§B5).
  let calibrationGap: AxisResult["calibrationGap"];
  if (selfRating !== undefined) {
    const delta = selfRating - comp;
    const errorBand = Math.max(0.15, est.sem * 0.15 + 0.12);
    if (Math.abs(delta) > errorBand) {
      calibrationGap = {
        self: selfRating,
        measured: comp,
        direction: delta > 0 ? "over" : "under",
      };
    }
  }

  const topMisconceptions = cw
    .map((r) => misconceptionsByCw.get(r.itemId))
    .filter((x): x is string => Boolean(x))
    .slice(0, 3);

  return {
    axis,
    theta: est.theta,
    sem: est.sem,
    band,
    composite: comp,
    provisional,
    calibrationGap,
    topMisconceptions,
  };
}

// ── helpers ───────────────────────────────────────────────────────────────
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
