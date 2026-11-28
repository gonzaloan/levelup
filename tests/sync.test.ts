import { describe, expect, it } from "vitest";
import { pack, unpack, syncEnabled } from "@/lib/sync";
import { emptyState, review, toRating, merge } from "@/lib/practice/store";

describe("sync wire format", () => {
  it("round-trips cards, days and reads (to the minute)", () => {
    const s = emptyState();
    review(s, "rag.a1", toRating(1, 1), new Date("2026-11-09T10:00:00Z"));
    s.days["2026-11-09"] = { xp: 40, n: 4, ok: 3, rs: 1 };
    s.days["2026-11-10"] = { xp: 20, n: 0, ok: 0 };
    s.read.rag = 1762682400000;
    s.goal = 100;
    const back = unpack(JSON.parse(JSON.stringify(pack(s))));
    expect(back.cards["rag.a1"].due).toBe(s.cards["rag.a1"].due);
    expect(back.cards["rag.a1"].reps).toBe(1);
    expect(back.cards["rag.a1"].stability).toBeCloseTo(s.cards["rag.a1"].stability, 3);
    expect(back.days).toEqual(s.days);
    expect(back.read).toEqual(s.read);
    expect(back.goal).toBe(100);
  });
  it("a heavy learner's state stays far below DynamoDB's 400 KB item limit", () => {
    const s = emptyState();
    const now = new Date("2026-11-09T10:00:00Z");
    for (let i = 0; i < 1600; i++) review(s, `concept-number-${i}.a${i % 4}`, toRating(1, 1), now);
    for (let d = 0; d < 365; d++) s.days[`2026-${String((d % 12) + 1).padStart(2, "0")}-${String((d % 28) + 1).padStart(2, "0")}`] = { xp: 60, n: 6, ok: 5 };
    expect(JSON.stringify(pack(s)).length).toBeLessThan(200_000);
  });
  it("unknown or empty payloads unpack to an empty state that merges cleanly", () => {
    const local = emptyState();
    local.read.x = 1;
    expect(merge(local, unpack(null)).read).toEqual({ x: 1 });
    expect(unpack({ v: 2 } as never).cards).toEqual({});
  });
  it("is disabled without configuration (the site stays local-only)", () => {
    expect(syncEnabled()).toBe(false);
  });
});

describe("gym progress in the synced item", () => {
  it("round-trips through pack/unpack and merges without losing a finished day or a skill", async () => {
    const { packGym, unpackGym } = await import("@/lib/sync");
    const { emptyGym, recordRep, finishDay, mergeGym } = await import("@/lib/gym/store");
    let a = emptyGym();
    a = recordRep(a, "2026-11-24", { skill: "trace", score: 1, ms: 5 });
    a = finishDay(a, "2026-11-24", [{ skill: "trace", score: 1, ms: 5 }]);
    let b = emptyGym();
    b = recordRep(b, "2026-11-25", { skill: "bigo", score: 0, ms: 3 });
    const back = unpackGym(JSON.parse(JSON.stringify(packGym(a))));
    expect(back.days["2026-11-24"]).toMatchObject({ done: true, reps: 1, score: 1, r: [1] });
    expect(back.skills.trace!.hist).toEqual([{ d: "2026-11-24", s: 1, k: 1 }]);
    const m = mergeGym(b, back);
    expect(Object.keys(m.days)).toEqual(["2026-11-24"]);
    expect(Object.keys(m.skills).sort()).toEqual(["bigo", "trace"]);
    expect(mergeGym(m, m)).toEqual(m);
  });
});

describe("coding progress in the synced item", () => {
  it("round-trips solved problems and their re-solve schedule, and merges two devices", async () => {
    const { packCode, unpackCode } = await import("@/lib/sync");
    const { mergeCode } = await import("@/lib/practice/resolve");
    const a = { solved: { x: 100, y: 300 }, reviews: { x: { due: 900, n: 1 } } };
    const b = { solved: { y: 200, z: 50 }, reviews: { x: { due: 500, n: 2 }, z: { due: 70, n: 0 } } };
    expect(unpackCode(JSON.parse(JSON.stringify(packCode(a))))).toEqual(a);
    const m = mergeCode(a, b);
    expect(m.solved).toEqual({ x: 100, y: 200, z: 50 });
    expect(m.reviews).toEqual({ x: { due: 500, n: 2 }, z: { due: 70, n: 0 } });
    expect(mergeCode(m, m)).toEqual(m);
    expect(unpackCode(undefined)).toEqual({ solved: {}, reviews: {} });
  });
});
