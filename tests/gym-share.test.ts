import { describe, expect, it } from "vitest";
import { beats, encodeChallenge, gymNumber, parseChallenge, shareText, summaryOf } from "@/lib/gym/share";

describe("gym share", () => {
  const results = [
    { skill: "estimate" as const, score: 1, ms: 30_000 },
    { skill: "trace" as const, score: 0.5, ms: 20_000 },
    { skill: "bigo" as const, score: 0, ms: 10_500 },
  ];
  it("numbers days from the epoch, across months and DST", () => {
    expect(gymNumber("2026-11-24")).toBe(1);
    expect(gymNumber("2026-12-01")).toBe(8);
    expect(gymNumber("2027-03-30")).toBe(127);
  });
  it("round-trips a challenge and rejects junk", () => {
    const c = summaryOf("2026-11-25", results);
    expect(c).toEqual({ date: "2026-11-25", pct: 50, secs: 61 });
    expect(parseChallenge(encodeChallenge(c))).toEqual(c);
    for (const bad of ["", "x", "20261325.50.61", "20261125.101.61", "20261125.50", "20261125.50.61<script>"]) expect(parseChallenge(bad)).toBeNull();
  });
  it("a higher score wins, then a faster time", () => {
    expect(beats({ date: "d", pct: 90, secs: 900 }, { date: "d", pct: 80, secs: 60 })).toBe(true);
    expect(beats({ date: "d", pct: 80, secs: 60 }, { date: "d", pct: 80, secs: 61 })).toBe(true);
    expect(beats({ date: "d", pct: 80, secs: 61 }, { date: "d", pct: 80, secs: 61 })).toBe(false);
  });
  it("shares squares, not answers, and a link that parses back", () => {
    const text = shareText(summaryOf("2026-11-25", results), results.map((r) => r.score), 3, "https://x.dev/es/gym/", "es");
    expect(text.split("\n")[0]).toBe("levelup Gym #2 · 50% · 1:01");
    expect(text).toContain("🟩🟨🟥");
    expect(text).toContain("🔥 3 días seguidos");
    expect(parseChallenge(text.match(/\?vs=(\S+)/)![1])).toEqual(summaryOf("2026-11-25", results));
  });
});
