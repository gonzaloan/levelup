import { describe, expect, it } from "vitest";
import { pack, unpack, syncEnabled } from "@/lib/sync";
import { emptyState, review, toRating, merge } from "@/lib/practice/store";

describe("sync wire format", () => {
  it("round-trips cards, days and reads (to the minute)", () => {
    const s = emptyState();
    review(s, "rag.a1", toRating(1, 1), new Date("2026-11-09T10:00:00Z"));
    s.days["2026-11-09"] = { xp: 40, n: 4, ok: 3 };
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
