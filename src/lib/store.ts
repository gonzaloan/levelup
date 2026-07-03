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
  fieldWork: Record<string, { submittedAt: number; selfScore?: number }>;
  roomsCleared: string[];
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

export function masterModule(moduleId: string, score: number): Progress {
  return update((p) => ({
    ...p,
    moduleScores: { ...p.moduleScores, [moduleId]: score },
    mastered: score >= 0.9 && !p.mastered.includes(moduleId) ? [...p.mastered, moduleId] : p.mastered,
    signal: score >= 0.9 ? p.signal + 20 : p.signal,
  }));
}

export function isUnlocked(moduleId: string, prerequisites: string[], p: Progress): boolean {
  return prerequisites.every((pre) => p.mastered.includes(pre));
}
