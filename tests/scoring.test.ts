import { describe, it, expect } from "vitest";
import {
  estimateTheta,
  pCorrect,
  toBand,
  composite,
  cbmScore,
  thetaToUnit,
  scoreAxis,
} from "@/lib/scoring";
import type { Response, Difficulty, Confidence } from "@/lib/types";

describe("MAP theta estimation (§C2)", () => {
  it("does not diverge on all-correct vectors", () => {
    const items = [
      { b: -1 as Difficulty, correct: true },
      { b: 0 as Difficulty, correct: true },
      { b: 1 as Difficulty, correct: true },
    ];
    const { theta, sem } = estimateTheta(items);
    expect(isFinite(theta)).toBe(true);
    expect(theta).toBeLessThanOrEqual(3.5);
    expect(theta).toBeGreaterThan(0); // all-correct pulls ability up
    expect(sem).toBeLessThan(999);
  });

  it("does not diverge on all-wrong vectors", () => {
    const items = [
      { b: -1 as Difficulty, correct: false },
      { b: 0 as Difficulty, correct: false },
      { b: 1 as Difficulty, correct: false },
    ];
    const { theta } = estimateTheta(items);
    expect(isFinite(theta)).toBe(true);
    expect(theta).toBeGreaterThanOrEqual(-3.5);
    expect(theta).toBeLessThan(0);
  });

  it("ranks a hard-item-right responder above an easy-only responder", () => {
    const hard = estimateTheta([
      { b: 1, correct: true },
      { b: 1, correct: true },
    ]);
    const easy = estimateTheta([
      { b: -1, correct: true },
      { b: -1, correct: true },
    ]);
    expect(hard.theta).toBeGreaterThan(easy.theta);
  });

  it("returns a neutral prior for empty input", () => {
    expect(estimateTheta([]).theta).toBe(0);
  });
});

describe("band cut-scores (§B1/§B2)", () => {
  it("maps composites to the three honest bands", () => {
    expect(toBand(0.2)).toBe("developing");
    expect(toBand(0.55)).toBe("solid");
    expect(toBand(0.85)).toBe("strong");
  });

  it("redistributes SJT weight when an axis has no SJT", () => {
    const withSjt = composite(0.8, 0.8, 0.8);
    const noSjt = composite(0.8, null, 0.8);
    // both should be high; no-SJT must still be a valid 0..1 number
    expect(noSjt).toBeGreaterThan(0.7);
    expect(withSjt).toBeGreaterThan(0.7);
  });
});

describe("CBM proper scoring (§3)", () => {
  it("rewards confident-correct over guess-correct", () => {
    const confident: Response[] = [mk(true, "high")];
    const guessing: Response[] = [mk(true, "low")];
    expect(cbmScore(confident)).toBeGreaterThan(cbmScore(guessing));
  });
  it("punishes confident-wrong hardest", () => {
    const confidentWrong: Response[] = [mk(false, "high")];
    const guessWrong: Response[] = [mk(false, "low")];
    expect(cbmScore(confidentWrong)).toBeLessThan(cbmScore(guessWrong));
  });
});

describe("confident-wrong cap needs ≥2 signals (§B4)", () => {
  it("does NOT cap a strong axis on a single confident-wrong", () => {
    // 6 strong answers + 1 confident-wrong on an easy item; still strong.
    const resp: Response[] = [
      mk(true, "high", 1),
      mk(true, "high", 1),
      mk(true, "high", 0),
      mk(true, "mid", 1),
      mk(true, "high", 1),
      mk(true, "high", 0),
      mk(false, "high", -1), // one confident-wrong
    ];
    const r = scoreAxis(1, resp, [], undefined, new Map());
    expect(r.band).toBe("strong");
  });
});

describe("calibration gap guarding (§B5)", () => {
  it("does not surface a tiny gap", () => {
    const resp: Response[] = [mk(true, "mid", 0), mk(true, "mid", 0)];
    const r = scoreAxis(1, resp, [], 0.55, new Map());
    // self≈measured → no gap
    expect(r.calibrationGap).toBeUndefined();
  });
  it("surfaces a large overconfidence gap", () => {
    const resp: Response[] = [mk(false, "high", 0), mk(false, "high", -1), mk(false, "mid", 0)];
    const r = scoreAxis(1, resp, [], 0.95, new Map());
    expect(r.calibrationGap?.direction).toBe("over");
  });
});

// ── helpers ──
let n = 0;
function mk(correct: boolean, confidence: Confidence, difficulty: Difficulty = 0): Response {
  return {
    itemId: `i${n++}`,
    optionId: "a",
    correct,
    confidence,
    axis: 1,
    difficulty,
    ts: 0,
  };
}
