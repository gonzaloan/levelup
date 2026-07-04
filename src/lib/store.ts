"use client";
// localStorage-first progress store (§4 backend decision). No server, no auth.
// Locale-independent IDs so switching language never loses progress.
// Cognito+DynamoDB sync is Phase 2 — this module is the single seam for it.
import type { AssessmentResult, Response } from "./types";

const KEY = "levelup.v1";

export interface Progress {
  assessment?: AssessmentResult;
  responseLog: Response[];          // logged for future IRT calibration (§3)
  mastered: string[];               // module ids
  moduleScores: Record<string, number>; // moduleId -> mastery ratio 0..1
  fieldWork: Record<string, { submittedAt: number; selfScore?: number; artifact?: string }>;
  roomsCleared: string[];
  gauntlets: Record<string, { firstScore: number; bestScore: number; attempts: number; clearedAt?: number }>;
  signal: number;                   // "XP" as competence feedback
  cadence: { enabled: boolean; weeks: string[] }; // opt-in, forgiving
  archetype?: string;
}

const EMPTY: Progress = {
  responseLog: [],
  mastered: [],
  moduleScores: {},
  fieldWork: {},
  roomsCleared: [],
  gauntlets: {},
  signal: 0,
  cadence: { enabled: false, weeks: [] },
};

export function load(): Progress {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Progress) };
  } catch {
    return { ...EMPTY };
  }
}

export function save(p: Progress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("levelup:progress"));
  } catch {
    /* quota / private mode — non-fatal, study still works in-session */
  }
}

export function update(fn: (p: Progress) => Progress): Progress {
  const next = fn(load());
  save(next);
  return next;
}

// Signal is competence feedback, never a quota. Awarded for demonstrated work.
export function awardSignal(amount: number): Progress {
  return update((p) => ({ ...p, signal: p.signal + amount }));
}

export interface MasteryOutcome {
  progress: Progress;
  newlyMastered: boolean; // crossed the ~90% threshold for the first time
  signalDelta: number;
}

// Mastery is a threshold crossing, not a participation trophy. Returns whether
// the learner *newly* crossed it so the caller can fire the star-ignition reward.
// The score is a CBM-normalized calibration score (0..1): confident-correct
// beats guess-correct, and confident-wrong is penalized. 0.8 ≈ mostly correct
// with honest confidence — you cannot click your way to it.
export function masterModule(moduleId: string, score: number, threshold = 0.8): MasteryOutcome {
  const before = load();
  const already = before.mastered.includes(moduleId);
  const crossed = score >= threshold && !already;
  const signalDelta = crossed ? 20 : 0;
  const progress = update((p) => ({
    ...p,
    moduleScores: { ...p.moduleScores, [moduleId]: Math.max(score, p.moduleScores[moduleId] ?? 0) },
    mastered: crossed ? [...p.mastered, moduleId] : p.mastered,
    signal: p.signal + signalDelta,
  }));
  return { progress, newlyMastered: crossed, signalDelta };
}

export function isUnlocked(moduleId: string, prerequisites: string[], p: Progress): boolean {
  return prerequisites.every((pre) => p.mastered.includes(pre));
}

// Record a Gauntlet attempt. Keeps the best score, counts attempts, and marks
// cleared once the learner crosses the threshold. Returns whether this attempt
// newly cleared it (for the reward loop).
export function recordGauntlet(
  id: string,
  score: number,
  clearThreshold = 0.8
): { progress: Progress; newlyCleared: boolean } {
  const before = load();
  const prior = before.gauntlets[id];
  const wasCleared = !!prior?.clearedAt;
  const nowCleared = score >= clearThreshold;
  const newlyCleared = nowCleared && !wasCleared;
  const progress = update((p) => {
    const g = p.gauntlets[id];
    const isFirst = !g;
    return {
      ...p,
      gauntlets: {
        ...p.gauntlets,
        [id]: {
          // First (cold-read) score is the only un-memorizable signal — freeze it.
          firstScore: isFirst ? score : g.firstScore,
          bestScore: Math.max(g?.bestScore ?? 0, score),
          attempts: (g?.attempts ?? 0) + 1,
          clearedAt: g?.clearedAt ?? (nowCleared ? Date.now() : undefined),
        },
      },
      signal: p.signal + (newlyCleared ? 40 : 0),
    };
  });
  return { progress, newlyCleared };
}
