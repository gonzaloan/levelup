// Badge derivation must be correct (they mark real milestones) and the OB 3.0
// export must be well-shaped. Uses the real curriculum via evaluateBadges.
import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, evaluateBadges, earnedBadges, badgeCredential } from "@/lib/badges";
import type { Progress } from "@/lib/store";

function emptyProgress(over: Partial<Progress> = {}): Progress {
  return {
    responseLog: [], mastered: [], moduleScores: {}, fieldWork: {},
    roomsCleared: [], gauntlets: {}, conceptsRead: [], checkpointsCleared: [],
    checkpointScores: {}, signal: 0, cadence: { enabled: false, weeks: [] }, ...over,
  } as Progress;
}

describe("badge catalog", () => {
  it("has unique ids and covers all categories", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const cats = new Set(ACHIEVEMENTS.map((a) => a.category));
    expect(cats.has("milestone")).toBe(true);
    expect(cats.has("domain")).toBe(true);
    expect(cats.has("level")).toBe(true);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(16); // 5 milestone + 6 domain + 5 level
  });
});

describe("badge derivation", () => {
  it("nothing earned on empty progress", () => {
    expect(earnedBadges(emptyProgress())).toEqual([]);
  });

  it("first-checkpoint earns after one cleared", () => {
    const p = emptyProgress({ checkpointsCleared: ["chk-technical-depth-l3"] });
    expect(ACHIEVEMENT_BY_ID.get("first-checkpoint")!.earned(p)).toBe(true);
    expect(ACHIEVEMENT_BY_ID.get("half-climb")!.earned(p)).toBe(false);
  });

  it("gauntlet cold-read needs firstScore >= 0.7", () => {
    const lo = emptyProgress({ gauntlets: { g: { firstScore: 0.5, bestScore: 0.9, attempts: 2 } } });
    const hi = emptyProgress({ gauntlets: { g: { firstScore: 0.8, bestScore: 0.8, attempts: 1 } } });
    expect(ACHIEVEMENT_BY_ID.get("gauntlet-coldread")!.earned(lo)).toBe(false);
    expect(ACHIEVEMENT_BY_ID.get("gauntlet-coldread")!.earned(hi)).toBe(true);
  });

  it("domain mastery needs all that domain's checkpoints", () => {
    const partial = emptyProgress({ checkpointsCleared: ["chk-technical-depth-l3", "chk-technical-depth-l4"] });
    expect(ACHIEVEMENT_BY_ID.get("domain-technical-depth")!.earned(partial)).toBe(false);
    const all = emptyProgress({ checkpointsCleared: ["l3", "l4", "l5", "l6", "l7"].map((l) => `chk-technical-depth-${l}`) });
    expect(ACHIEVEMENT_BY_ID.get("domain-technical-depth")!.earned(all)).toBe(true);
  });

  it("evaluateBadges sorts earned first", () => {
    const p = emptyProgress({ checkpointsCleared: ["chk-technical-depth-l3"] });
    const list = evaluateBadges(p);
    expect(list[0].earned).toBe(true);
    expect(list.length).toBe(ACHIEVEMENTS.length);
  });
});

describe("OB 3.0 credential shape (unsigned)", () => {
  it("builds a VC-2.0-envelope OpenBadgeCredential with no proof", () => {
    const a = ACHIEVEMENT_BY_ID.get("full-climb")!;
    const c = badgeCredential(a, { origin: "https://levelup.example/", validFrom: "2026-07-07T00:00:00Z", locale: "en" });
    expect(c["@context"][0]).toBe("https://www.w3.org/ns/credentials/v2");
    expect(c.type).toEqual(["VerifiableCredential", "OpenBadgeCredential"]);
    expect(c.credentialSubject.achievement.name.length).toBeGreaterThan(0);
    expect(c.credentialSubject.achievement.image.id).toMatch(/^https:\/\/levelup\.example\/badges\/full-climb\.webp$/);
    expect((c as Record<string, unknown>).proof).toBeUndefined(); // unsigned by design
  });
});
