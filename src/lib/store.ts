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
  conceptsRead: string[];           // curriculum concept slugs the learner has opened
  checkpointsCleared: string[];     // checkpoint ids cleared at the mastery gate
  checkpointScores: Record<string, number>; // checkpointId -> best score 0..1
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
  conceptsRead: [],
  checkpointsCleared: [],
  checkpointScores: {},
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

// ── Curriculum progress ───────────────────────────────────────────────────
// Concepts are "read" (lightweight — opening the concept counts); checkpoints
// are the real gate (a scored quiz you must clear). A level band is complete for
// a domain once its checkpoint is cleared. This keeps the honest distinction
// between exposure (read) and demonstrated understanding (checkpoint cleared).
export function markConceptRead(slug: string): Progress {
  return update((p) =>
    p.conceptsRead.includes(slug) ? p : { ...p, conceptsRead: [...p.conceptsRead, slug] }
  );
}

// Mark a set of concept slugs read at once (a whole lesson's concepts).
export function markConceptsRead(slugs: string[]): Progress {
  return update((p) => {
    const set = new Set(p.conceptsRead);
    let changed = false;
    for (const s of slugs) if (!set.has(s)) { set.add(s); changed = true; }
    return changed ? { ...p, conceptsRead: [...set] } : p;
  });
}

export interface CheckpointOutcome {
  progress: Progress;
  newlyCleared: boolean;
  score: number;
}

// A checkpoint clears at ≥0.85 (Bloom mastery-learning threshold, per the
// pedagogy research). Records the best score; only the first clear awards Signal.
export function recordCheckpoint(id: string, score: number, threshold = 0.85): CheckpointOutcome {
  const before = load();
  const already = before.checkpointsCleared.includes(id);
  const cleared = score >= threshold;
  const newlyCleared = cleared && !already;
  const progress = update((p) => ({
    ...p,
    checkpointScores: { ...p.checkpointScores, [id]: Math.max(score, p.checkpointScores[id] ?? 0) },
    checkpointsCleared: newlyCleared ? [...p.checkpointsCleared, id] : p.checkpointsCleared,
    signal: p.signal + (newlyCleared ? 30 : 0),
  }));
  return { progress, newlyCleared, score };
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
