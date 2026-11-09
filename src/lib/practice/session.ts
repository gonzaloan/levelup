// Builds study sessions from the item bank and the learner's state. Pure: same inputs, same queue.
import { State } from "ts-fsrs";
import type { PItem, PracticeData } from "./types";
import { isDue, retrievability, type StudyState } from "./store";
import { shuffle } from "./rng";

export type Mode = "daily" | "concept" | "module" | "topic" | "weak" | "mock" | "cards";
export interface SessionSpec { mode: Mode; id?: string; size?: number; seed?: string }

export const pathOrder = (data: PracticeData) => data.phases.flatMap((p) => p.modules.flatMap((m) => m.c));

/** Never two items of the same concept back to back when it can be avoided (interleaving). */
export function interleave(items: PItem[]): PItem[] {
  const groups = new Map<string, PItem[]>();
  for (const it of items) { if (!groups.has(it.c)) groups.set(it.c, []); groups.get(it.c)!.push(it); }
  const out: PItem[] = [];
  const queues = [...groups.values()];
  while (out.length < items.length) for (const q of queues) { const x = q.shift(); if (x) out.push(x); }
  return out;
}

const TYPE_ORDER: Record<string, number> = { mcq: 0, multi: 1, code: 1, order: 1, match: 1, numeric: 1, diagram: 2, recall: 3 };
const conceptItems = (data: PracticeData, c: string) =>
  data.items.filter((i) => i.c === c).sort((a, b) => (a.id.endsWith(".def") ? -1 : b.id.endsWith(".def") ? 1 : TYPE_ORDER[a.type] - TYPE_ORDER[b.type]));

/** Concepts the learner has touched (read or practiced), in path order. */
export function startedConcepts(data: PracticeData, s: StudyState): string[] {
  const practiced = practicedSet(s);
  return pathOrder(data).filter((c) => s.read[c] || practiced.has(c));
}

const practicedSet = (s: StudyState) => new Set(Object.keys(s.cards).map((k) => k.slice(0, k.indexOf("."))));

/** The next concept in the path the learner hasn't studied yet (neither read nor practiced). */
export const nextConcept = (data: PracticeData, s: StudyState) => {
  const done = practicedSet(s);
  return pathOrder(data).find((c) => !s.read[c] && !done.has(c));
};

export function dueItems(data: PracticeData, s: StudyState, now: Date): PItem[] {
  return data.items.filter((i) => isDue(s.cards[i.id], now)).sort((a, b) => Date.parse(s.cards[a.id].due) - Date.parse(s.cards[b.id].due));
}

export function buildSession(data: PracticeData, s: StudyState, spec: SessionSpec, now: Date): PItem[] {
  const size = spec.size ?? 15;
  const seed = spec.seed ?? now.toDateString();
  const fresh = (i: PItem) => !s.cards[i.id];
  switch (spec.mode) {
    case "concept":
      return conceptItems(data, spec.id ?? "");
    case "daily": {
      const due = dueItems(data, s, now).slice(0, size);
      const room = Math.max(5, size - due.length);
      // New items come from concepts already started; if none, from the next two in the path
      // (a short "pretest" before reading also helps learning).
      let pool = startedConcepts(data, s).flatMap((c) => conceptItems(data, c)).filter(fresh);
      if (!pool.length) {
        const next = pathOrder(data).filter((c) => !s.read[c]).slice(0, 2);
        pool = next.flatMap((c) => conceptItems(data, c)).filter(fresh);
      }
      return interleave([...due, ...pool.filter((i) => i.type !== "recall").slice(0, room)]);
    }
    case "module":
    case "topic": {
      const ids = spec.mode === "module"
        ? data.phases.flatMap((p) => p.modules).find((m) => m.id === spec.id)?.c ?? []
        : Object.keys(data.meta).filter((c) => data.meta[c].d === spec.id);
      const pool = ids.flatMap((c) => conceptItems(data, c)).filter((i) => i.type !== "recall");
      const due = pool.filter((i) => isDue(s.cards[i.id], now));
      const unseen = pool.filter(fresh);
      const rest = pool.filter((i) => !fresh(i) && !isDue(s.cards[i.id], now));
      return interleave(shuffle([...due, ...shuffle(unseen, seed), ...shuffle(rest, seed)].slice(0, size), seed));
    }
    case "weak": {
      const reviewed = data.items.filter((i) => s.cards[i.id] && s.cards[i.id].state !== State.New);
      return interleave(reviewed
        .map((i) => ({ i, r: retrievability(s.cards[i.id], now), l: s.cards[i.id].lapses }))
        .filter((x) => x.l > 0 || x.r < 0.85)
        .sort((a, b) => b.l - a.l || a.r - b.r)
        .slice(0, size).map((x) => x.i));
    }
    case "cards": {
      const pool = data.items.filter((i) => i.type === "recall" && (!spec.id || data.meta[i.c]?.d === spec.id));
      const due = pool.filter((i) => isDue(s.cards[i.id], now));
      return [...due, ...shuffle(pool.filter(fresh), seed)].slice(0, size);
    }
    case "mock": {
      // A mixed, timed round across the three phases — like a real loop, not a single topic.
      const objective = data.items.filter((i) => i.type !== "recall" && !i.id.endsWith(".def"));
      const byPhase = data.phases.map((p) => new Set(p.modules.flatMap((m) => m.c)));
      const pickFrom = (set: Set<string>, n: number) => shuffle(objective.filter((i) => set.has(i.c)), seed).slice(0, n);
      const numeric = shuffle(objective.filter((i) => i.type === "numeric"), seed + "n").slice(0, 2);
      const taken = new Set(numeric.map((i) => i.id));
      const rest = byPhase.flatMap((set) => pickFrom(set, Math.ceil((spec.size ?? 12) / 3) + 1)).filter((i) => !taken.has(i.id));
      return interleave([...numeric, ...rest].slice(0, spec.size ?? 12));
    }
  }
}

/* ------------------------------------------------------------------ mastery */
export type ConceptStatus = "new" | "learning" | "review" | "mastered";

/** new: never practiced · learning: started · review: every exercise passed once · mastered: every exercise stable ≥ 3 weeks. */
export function conceptStatus(data: PracticeData, s: StudyState, c: string, byConcept?: Map<string, PItem[]>): ConceptStatus {
  const items = (byConcept?.get(c) ?? data.items.filter((i) => i.c === c)).filter((i) => i.type !== "recall");
  const cards = items.map((i) => s.cards[i.id]);
  if (!cards.some(Boolean)) return "new";
  if (cards.every((r) => r && r.state === State.Review && r.stability >= 21)) return "mastered";
  if (cards.every((r) => r && (r.state === State.Review || r.stability >= 1))) return "review";
  return "learning";
}

export function indexByConcept(data: PracticeData) {
  const m = new Map<string, PItem[]>();
  for (const i of data.items) { if (!m.has(i.c)) m.set(i.c, []); m.get(i.c)!.push(i); }
  return m;
}
