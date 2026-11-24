// The mock coding interview's choice of problems. Pure, so it is unit-tested apart from the page.
export interface MockProblem {
  id: string; c: string; ct: string; d: "easy" | "medium" | "hard"; t: string; prompt: string; fn: string; starter: string;
  tests: { args: unknown[]; expected: unknown; visible?: boolean }[]; compare: string;
}

/** Two problems: an easier and a harder one, different patterns, unsolved first, random among equals. */
export function pickTwo(all: MockProblem[], solved: Record<string, number>, rand: () => number): MockProblem[] {
  const order = (xs: MockProblem[]) => xs.map((p) => ({ p, k: (solved[p.id] ? 1 : 0) + rand() })).sort((a, b) => a.k - b.k).map((x) => x.p);
  const first = order(all.filter((p) => p.d !== "hard"))[0];
  if (!first) return all.slice(0, 2);
  const second = order(all.filter((p) => p.d !== "easy" && p.c !== first.c && p.id !== first.id))[0] ?? all.find((p) => p.id !== first.id);
  return second ? [first, second] : [first];
}

