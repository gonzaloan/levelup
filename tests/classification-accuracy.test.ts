// §B3 requirement: a Monte-Carlo fixture that simulates known-ability
// responders and confirms the 3-band classifier is acceptably accurate
// (target ≥80% correct band). If this fails, the honest fix is to add items
// on decisive axes — NOT to loosen the bands.
import { describe, it, expect } from "vitest";
import { estimateTheta, thetaToUnit, composite, toBand, pCorrect } from "@/lib/scoring";
import type { Band } from "@/lib/axes";
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

describe("3-band classification accuracy (Monte-Carlo, §B3)", () => {
  it("classifies simulated responders into the correct band ≥80% of the time (excluding boundary cases)", () => {
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
