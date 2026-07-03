// Two fixtures:
//  (1) theta-recovery precision under a self-consistent, well-calibrated
//      responder — measures whether the estimator + band cuts recover ability.
//      NOTE: this is intentionally self-consistent (SJT/CBM ≈ knowledge), so it
//      tests estimation, not construct validity of the fusion weights.
//  (2) a MIS-CALIBRATED responder — SJT/CBM decoupled from knowledge, an
//      overconfident guesser — which CAN fail if the fusion or the
//      confident-wrong cap misbehave. This is the test that has teeth.
import { describe, it, expect } from "vitest";
import { estimateTheta, thetaToUnit, composite, toBand, pCorrect, scoreAxis } from "@/lib/scoring";
import type { Band } from "@/lib/axes";
import type { Response, Confidence, Difficulty } from "@/lib/types";
import { ITEMS_PER_AXIS } from "@/lib/router";

// Deterministic PRNG (mulberry32) so the test is reproducible.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// True band for a given true ability (via the same unit+cut mapping we score with),
// assuming a well-calibrated responder (SJT≈CBM≈knowledge on average).
function trueBand(trueTheta: number): Band {
  return toBand(thetaToUnit(trueTheta));
}

// Simulate one responder of a given ability answering ITEMS_PER_AXIS items.
// Difficulty ADAPTS toward the running ability estimate (as the real MST router
// does), which concentrates measurement information near theta and lowers SEM.
function simulate(trueTheta: number, rand: () => number): Band {
  const answered: { b: -1 | 0 | 1; correct: boolean }[] = [];
  let tier = 0; // start mid, like the router
  for (let i = 0; i < ITEMS_PER_AXIS; i++) {
    const b = tier as -1 | 0 | 1;
    const p = pCorrect(trueTheta, b);
    const correct = rand() < p;
    answered.push({ b, correct });
    // branch up on correct, down on wrong (mirrors router.nextTier)
    tier = Math.max(-1, Math.min(1, tier + (correct ? 1 : -1)));
  }
  const est = estimateTheta(answered);
  const k = thetaToUnit(est.theta);
  // Well-calibrated responder: model SJT and CBM as noisy echoes of ability.
  const s = Math.max(0, Math.min(1, k + (rand() - 0.5) * 0.12));
  const c = Math.max(0, Math.min(1, k + (rand() - 0.5) * 0.12));
  return toBand(composite(k, s, c));
}

describe("theta-recovery precision under a self-consistent responder (§B3)", () => {
  it("recovers the correct band ≥80% of the time for a well-calibrated responder (excluding boundary cases)", () => {
    const rand = rng(12345);
    // Sample true abilities across the range, but skip a small dead-band around
    // each cut-score where even a perfect measure legitimately rounds either way.
    const cuts = [0.4, 0.7];
    let total = 0;
    let correct = 0;
    for (let iter = 0; iter < 4000; iter++) {
      const trueTheta = -3 + rand() * 6; // -3..3
      const u = thetaToUnit(trueTheta);
      // exclude a ±0.04 dead-band around the composite cut-scores
      if (cuts.some((cut) => Math.abs(u - cut) < 0.04)) continue;
      const predicted = simulate(trueTheta, rand);
      const expected = trueBand(trueTheta);
      total++;
      if (predicted === expected) correct++;
    }
    const accuracy = correct / total;
    // Report for visibility when it runs.
    // eslint-disable-next-line no-console
    console.log(`3-band accuracy over ${total} sims: ${(accuracy * 100).toFixed(1)}%`);
    expect(accuracy).toBeGreaterThanOrEqual(0.8);
  });

  it("adjacent-band tolerance is ≥97% (rarely off by two bands)", () => {
    const rand = rng(999);
    const order: Band[] = ["developing", "solid", "strong"];
    let total = 0;
    let within1 = 0;
    for (let iter = 0; iter < 3000; iter++) {
      const trueTheta = -3 + rand() * 6;
      const predicted = simulate(trueTheta, rand);
      const expected = trueBand(trueTheta);
      total++;
      if (Math.abs(order.indexOf(predicted) - order.indexOf(expected)) <= 1) within1++;
    }
    expect(within1 / total).toBeGreaterThanOrEqual(0.97);
  });
});

// ── Fixture 2: the test with teeth — mis-calibrated responders ────────────
function mkResp(correct: boolean, confidence: Confidence, difficulty: Difficulty): Response {
  return { itemId: Math.random().toString(36).slice(2), optionId: "x", correct, confidence, axis: 1, difficulty, ts: 0 };
}

describe("mis-calibrated responders (the fusion + confident-wrong cap have teeth)", () => {
  it("an overconfident guesser (mostly wrong, always 'high') is NOT placed Strong", () => {
    // 6 wrong-at-high-confidence + 1 lucky right. A naive scorer that ignored
    // correctness or calibration might drift up; ours must not.
    const resp: Response[] = [
      mkResp(false, "high", 0), mkResp(false, "high", 0), mkResp(false, "high", 1),
      mkResp(false, "high", 0), mkResp(false, "high", -1), mkResp(false, "high", 0),
      mkResp(true, "high", -1),
    ];
    const r = scoreAxis(1, resp, [], 0.9 /* self-rates high */, new Map());
    expect(r.band).not.toBe("strong");
    // and the overconfidence gap must surface
    expect(r.calibrationGap?.direction).toBe("over");
  });

  it("a knowledgeable but under-confident responder is not dragged below Solid by low confidence alone", () => {
    // All correct, but always hedged 'low'. Knowledge should still carry them;
    // CBM is only a 15% modifier, so low confidence can't tank a right-answer run.
    const resp: Response[] = [
      mkResp(true, "low", 1), mkResp(true, "low", 1), mkResp(true, "low", 0),
      mkResp(true, "low", 1), mkResp(true, "low", 0), mkResp(true, "low", 1),
      mkResp(true, "low", 0),
    ];
    const r = scoreAxis(1, resp, [], 0.3 /* self-rates low */, new Map());
    expect(r.band).not.toBe("developing");
    // under-confidence gap surfaces
    expect(r.calibrationGap?.direction).toBe("under");
  });

  it("a single confident-wrong does NOT cap a strong axis (needs ≥2 signals)", () => {
    const resp: Response[] = [
      mkResp(true, "high", 1), mkResp(true, "high", 1), mkResp(true, "high", 1),
      mkResp(true, "high", 0), mkResp(true, "high", 1), mkResp(true, "high", 0),
      mkResp(false, "high", -1),
    ];
    const r = scoreAxis(1, resp, [], undefined, new Map());
    expect(r.band).toBe("strong");
  });
});
