import { describe, it, expect } from "vitest";
import {
  BACKUP_VERSION,
  backupFilename,
  buildBackup,
  describeProgress,
  parseBackup,
  serializeBackup,
} from "@/lib/backup";

// The point of this module is that a learner can move their progress between
// devices without an account. The risk is entirely on IMPORT: it overwrites the
// only copy of a study history, so a malformed or hostile file must be rejected
// or repaired, never partially applied.

const FULL = {
  assessment: {
    axes: [{ axis: 1, theta: 0.4, sem: 0.2, band: "L5", composite: 0.62, provisional: false }],
    weakest: [1],
    completedAt: 1750000000000,
  },
  responseLog: [{ itemId: "i1", optionId: "o1", correct: true, confidence: "sure", axis: 1, difficulty: "med", ts: 1 }],
  mastered: ["gen-l5-m1"],
  moduleScores: { "gen-l5-m1": 0.9 },
  fieldWork: { fw1: { submittedAt: 1, selfScore: 0.5, artifact: "note" } },
  roomsCleared: ["r1"],
  gauntlets: { g1: { firstScore: 0.4, bestScore: 0.8, attempts: 2, clearedAt: 3 } },
  conceptsRead: ["a", "b"],
  checkpointsCleared: ["chk-1"],
  checkpointScores: { "chk-1": 0.91 },
  signal: 240,
  cadence: { enabled: true, weeks: ["2026-W30"] },
  archetype: "builder",
  reviews: { a: { due: "2026-08-01", step: 3, ease: 2.4, reps: 5, lapses: 1, last: "2026-07-25" } },
  streak: { days: ["2026-07-24", "2026-07-25"] },
  dailyLog: { "2026-07-25": { conceptSlug: "a", domainId: "d", learned: true, checkPassed: true, reviewsDone: 2, completedAt: 9 } },
  skipped: ["z"],
};

const wrap = (progress: unknown) =>
  JSON.stringify({ app: "levelup", version: BACKUP_VERSION, exportedAt: "2026-07-27T00:00:00.000Z", progress });

describe("export", () => {
  it("round-trips a full progress object without losing a field", () => {
    const backup = buildBackup(new Date("2026-07-27T10:00:00Z"), FULL as never);
    const parsed = parseBackup(serializeBackup(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // The path-dependent parts are what a lossy round-trip would quietly ruin.
    expect(parsed.progress.reviews.a).toEqual(FULL.reviews.a);
    expect(parsed.progress.streak.days).toEqual(FULL.streak.days);
    expect(parsed.progress.signal).toBe(240);
    expect(parsed.progress.checkpointScores).toEqual(FULL.checkpointScores);
    expect(parsed.progress.dailyLog["2026-07-25"].reviewsDone).toBe(2);
  });

  it("names the file by date, so exports sort and don't collide by accident", () => {
    expect(backupFilename(new Date("2026-07-27T23:59:00Z"))).toBe("levelup-progress-2026-07-27.json");
  });

  it("summarises a progress object for the confirm step", () => {
    const s = describeProgress(FULL as never);
    expect(s).toContain("2 concepts read");
    expect(s).toContain("1 checkpoint cleared");   // singular
    expect(s).toContain("240 signal");
  });
});

describe("import rejects what it cannot trust", () => {
  it("rejects non-JSON", () => {
    const r = parseBackup("not json {");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/JSON/);
  });

  it("rejects another app's backup", () => {
    const r = parseBackup(JSON.stringify({ app: "get-certified", version: 1, progress: {} }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/different app/);
  });

  it("rejects a backup from a future version rather than guessing its shape", () => {
    const r = parseBackup(JSON.stringify({ app: "levelup", version: BACKUP_VERSION + 1, progress: {} }));
    expect(r.ok).toBe(false);
  });

  it("rejects an envelope with no progress", () => {
    expect(parseBackup(JSON.stringify({ app: "levelup", version: 1 })).ok).toBe(false);
  });
});

describe("import repairs what it can, and says so", () => {
  it("fills every field from an empty progress object", () => {
    const r = parseBackup(wrap({}));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // An import must produce a COMPLETE Progress, or the app crashes reading a
    // field the file happened not to have.
    expect(r.progress.conceptsRead).toEqual([]);
    expect(r.progress.reviews).toEqual({});
    expect(r.progress.streak).toEqual({ days: [] });
    expect(r.progress.cadence).toEqual({ enabled: false, weeks: [] });
    expect(r.progress.signal).toBe(0);
  });

  it("drops a review entry missing its ladder position instead of resetting it", () => {
    const r = parseBackup(wrap({ reviews: { a: { due: "2026-08-01" }, b: FULL.reviews.a } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Resetting to step 0 would tell the learner to re-review something they know.
    expect(Object.keys(r.progress.reviews)).toEqual(["b"]);
    expect(r.warnings.join(" ")).toMatch(/review schedule/);
  });

  it("drops streak days that are not day keys, and warns", () => {
    const r = parseBackup(wrap({ streak: { days: ["2026-07-24", "yesterday", 5, "2026-13-99x"] } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.streak.days).toEqual(["2026-07-24"]);
    expect(r.warnings.join(" ")).toMatch(/streak day/);
  });

  it("clamps an out-of-range ease rather than trusting the file", () => {
    const r = parseBackup(wrap({ reviews: { a: { ...FULL.reviews.a, ease: 99 } } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.reviews.a.ease).toBeLessThanOrEqual(2.8);
  });

  it("refuses a negative signal", () => {
    const r = parseBackup(wrap({ signal: -500 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.signal).toBe(0);
  });

  it("ignores wrong-typed entries inside arrays and records", () => {
    const r = parseBackup(wrap({
      conceptsRead: ["a", 7, null, "b"],
      moduleScores: { m1: 0.5, m2: "high", m3: NaN },
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.conceptsRead).toEqual(["a", "b"]);
    expect(r.progress.moduleScores).toEqual({ m1: 0.5 });
  });

  it("drops a placement result whose axes are unusable, and warns", () => {
    const r = parseBackup(wrap({ assessment: { axes: [{ axis: "one" }], weakest: [] } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.assessment).toBeUndefined();
    expect(r.warnings.join(" ")).toMatch(/placement/);
  });

  it("keeps only weakest ids that name an axis in the same result", () => {
    const r = parseBackup(wrap({ assessment: { ...FULL.assessment, weakest: [1, 4, 99] } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.assessment?.weakest).toEqual([1]);
  });

  it("survives a prototype-pollution attempt in the file", () => {
    const r = parseBackup(
      '{"app":"levelup","version":1,"progress":{"__proto__":{"polluted":true},"conceptsRead":["a"]}}',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.conceptsRead).toEqual(["a"]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
