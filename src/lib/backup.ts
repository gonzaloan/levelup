"use client";
/**
 * Export / import the learner's progress as a file.
 *
 * There is no account and no server: progress lives in one localStorage key, so
 * clearing site data or switching laptop loses everything. Sync would fix that,
 * and the Cognito evaluation (docs/specs/2026-07-26-cognito-reuse-evaluation.md)
 * put it at 8-11 days — half of that spent on a merge strategy, because `reviews`
 * is a path-dependent interval ladder and `signal` is a counter, so a
 * last-write-wins blob would silently lose a day's work.
 *
 * This is the half-day answer to the same problem: a file the learner owns. It
 * keeps the no-login promise, works offline, and moves progress between devices
 * today.
 *
 * The whole risk here is IMPORT. A malformed or hostile file must never corrupt a
 * real study history, so every field is validated and coerced before anything is
 * written, and an import that fails validation writes nothing at all.
 */
import { load, type Progress } from "./store";

const KEY = "levelup.v1";
/** Bumped only if the envelope changes — not for additive Progress fields. */
export const BACKUP_VERSION = 1;

export interface Backup {
  app: "levelup";
  version: number;
  exportedAt: string;   // ISO, display only — never used for logic
  progress: Progress;
}

/** A stable, human-inspectable filename. Date only: one export per day is plenty. */
export function backupFilename(now: Date): string {
  const d = now.toISOString().slice(0, 10);
  return `levelup-progress-${d}.json`;
}

export function buildBackup(now: Date, progress: Progress = load()): Backup {
  return { app: "levelup", version: BACKUP_VERSION, exportedAt: now.toISOString(), progress };
}

/** Serialize for download. Pretty-printed: the learner should be able to read it. */
export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

// ── Validation ─────────────────────────────────────────────────────────────
// Coerce rather than trust. Each helper returns a safe value of the right shape,
// so a file with a string where a number belongs imports the rest instead of
// throwing away the learner's whole history.

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const numRecord = (v: unknown): Record<string, number> => {
  if (!isObj(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v)) if (typeof n === "number" && Number.isFinite(n)) out[k] = n;
  return out;
};

const objRecord = <T>(v: unknown, pick: (x: Record<string, unknown>) => T | null): Record<string, T> => {
  if (!isObj(v)) return {};
  const out: Record<string, T> = {};
  for (const [k, val] of Object.entries(v)) {
    if (!isObj(val)) continue;
    const kept = pick(val);
    if (kept !== null) out[k] = kept;
  }
  return out;
};

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

export type ImportResult =
  | { ok: true; progress: Progress; warnings: string[] }
  | { ok: false; error: string };

/**
 * Parse and validate a backup file's text.
 *
 * Returns the progress to write, or an error — and never a partially-applied
 * state. Warnings describe fields that were dropped or repaired, so a learner
 * whose file was hand-edited finds out rather than silently losing a section.
 */
export function parseBackup(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!isObj(raw)) return { ok: false, error: "That file doesn't contain a backup object." };
  if (raw.app !== "levelup") {
    return { ok: false, error: "That backup is from a different app." };
  }
  if (typeof raw.version !== "number" || raw.version > BACKUP_VERSION) {
    return { ok: false, error: "That backup was made by a newer version of level·up." };
  }
  if (!isObj(raw.progress)) return { ok: false, error: "That backup has no progress in it." };

  const p = raw.progress;
  const warnings: string[] = [];
  const warnIf = (cond: boolean, msg: string) => { if (cond) warnings.push(msg); };

  // The placement result drives the whole ladder view, so its required fields are
  // checked rather than asserted — a cast here would let a half-written object
  // through and crash the render instead of the import.
  type Axis = NonNullable<Progress["assessment"]>["axes"][number];
  const axes = (isObj(p.assessment) && Array.isArray(p.assessment.axes) ? p.assessment.axes : []).filter(
    (a): a is Axis =>
      isObj(a) &&
      // AxisId is 1..7, a numeric union — not a string id.
      typeof a.axis === "number" &&
      typeof a.theta === "number" &&
      typeof a.band === "string" &&
      typeof a.composite === "number",
  );
  // Keep only ids that name an axis actually present in this result: `AxisId` is a
  // union, and a bogus id would render as an empty lane rather than fail loudly.
  const claimedWeakest = (isObj(p.assessment) && Array.isArray(p.assessment.weakest) ? p.assessment.weakest : [])
    .filter((n): n is number => typeof n === "number");
  const weakest = axes.map((a) => a.axis).filter((id) => claimedWeakest.includes(id));
  const assessment =
    isObj(p.assessment) && axes.length > 0
      ? {
          axes,
          weakest,
          archetype: typeof p.assessment.archetype === "string" ? p.assessment.archetype : undefined,
          completedAt: num(p.assessment.completedAt),
        }
      : undefined;
  warnIf(p.assessment !== undefined && assessment === undefined, "placement result was unreadable and was dropped");

  // The answer log only feeds future calibration, so an entry missing a field is
  // dropped rather than repaired — a wrong response is worse than a missing one.
  const responseLog = (Array.isArray(p.responseLog) ? p.responseLog : []).filter(
    (r): r is Progress["responseLog"][number] =>
      isObj(r) &&
      typeof r.itemId === "string" &&
      typeof r.optionId === "string" &&
      typeof r.correct === "boolean",
  );
  warnIf(p.responseLog !== undefined && !Array.isArray(p.responseLog), "answer log was unreadable and was dropped");

  const progress: Progress = {
    assessment,
    responseLog,
    mastered: strArray(p.mastered),
    moduleScores: numRecord(p.moduleScores),
    fieldWork: objRecord(p.fieldWork, (x) => ({
      submittedAt: num(x.submittedAt),
      selfScore: typeof x.selfScore === "number" ? x.selfScore : undefined,
      artifact: typeof x.artifact === "string" ? x.artifact : undefined,
    })),
    roomsCleared: strArray(p.roomsCleared),
    gauntlets: objRecord(p.gauntlets, (x) => ({
      firstScore: num(x.firstScore),
      bestScore: num(x.bestScore),
      attempts: num(x.attempts),
      clearedAt: typeof x.clearedAt === "number" ? x.clearedAt : undefined,
    })),
    conceptsRead: strArray(p.conceptsRead),
    checkpointsCleared: strArray(p.checkpointsCleared),
    checkpointScores: numRecord(p.checkpointScores),
    // Attempts spent per checkpoint. Restored so a backup round-trip cannot reset
    // the cap — which would reintroduce the bypass by a slower route than F5.
    checkpointAttempts: numRecord(p.checkpointAttempts),
    signal: Math.max(0, num(p.signal)),
    cadence: isObj(p.cadence)
      ? { enabled: p.cadence.enabled === true, weeks: strArray(p.cadence.weeks) }
      : { enabled: false, weeks: [] },
    archetype: typeof p.archetype === "string" ? p.archetype : undefined,
    // The review ladder is path-dependent: `interval` and `due` must survive
    // exactly, or the schedule silently resets to day one.
    reviews: objRecord(p.reviews, (x) => {
      // `due` and `step` are the ladder's position. Without both, the schedule is
      // meaningless, so the entry is dropped rather than reset to day one — which
      // would quietly tell the learner to re-review something they know.
      if (typeof x.due !== "string" || typeof x.step !== "number") return null;
      return {
        due: x.due,
        step: Math.max(0, num(x.step)),
        // 1.3 … 2.8 is the authored range; clamp instead of trusting the file.
        ease: Math.min(2.8, Math.max(1.3, num(x.ease, 2.5))),
        reps: Math.max(0, num(x.reps)),
        lapses: Math.max(0, num(x.lapses)),
        last: typeof x.last === "string" ? x.last : x.due,
      } as Progress["reviews"][string];
    }),
    // Streak days are compared as strings; a non-day-key entry would break the
    // monotonicity the ribbon depends on, so only YYYY-MM-DD survives.
    streak: { days: (isObj(p.streak) ? strArray(p.streak.days) : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) },
    dailyLog: objRecord(p.dailyLog, (x) => ({
      conceptSlug: typeof x.conceptSlug === "string" ? x.conceptSlug : undefined,
      domainId: typeof x.domainId === "string" ? x.domainId : undefined,
      learned: x.learned === true,
      checkPassed: typeof x.checkPassed === "boolean" ? x.checkPassed : undefined,
      reviewsDone: Math.max(0, num(x.reviewsDone)),
      completedAt: num(x.completedAt),
    })),
    skipped: strArray(p.skipped),
    // Codex entries marked read. Additive: a backup written before the Codex
    // existed has no such key, and strArray yields [] rather than failing the
    // import — an older export must always still restore.
    codexRead: strArray(p.codexRead),
  };

  const droppedStreak = (isObj(p.streak) ? strArray(p.streak.days).length : 0) - progress.streak.days.length;
  warnIf(droppedStreak > 0, `${droppedStreak} streak day(s) had an invalid date and were dropped`);
  const droppedReviews = (isObj(p.reviews) ? Object.keys(p.reviews).length : 0) - Object.keys(progress.reviews).length;
  warnIf(droppedReviews > 0, `${droppedReviews} review schedule(s) were incomplete and were dropped`);

  return { ok: true, progress, warnings };
}

/** A one-line summary so the learner can confirm before overwriting. */
export function describeProgress(p: Progress): string {
  const parts = [
    `${p.conceptsRead.length} concept${p.conceptsRead.length === 1 ? "" : "s"} read`,
    `${p.checkpointsCleared.length} checkpoint${p.checkpointsCleared.length === 1 ? "" : "s"} cleared`,
    `${p.streak.days.length} day${p.streak.days.length === 1 ? "" : "s"} of study`,
    `${p.signal} signal`,
  ];
  return parts.join(" · ");
}

/**
 * Write an imported progress object.
 *
 * Kept separate from parsing so the UI can show what it is about to replace and
 * get a confirmation first — an import overwrites, and the thing it overwrites is
 * the only copy.
 */
export function applyBackup(progress: Progress): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent("levelup:progress"));
}
