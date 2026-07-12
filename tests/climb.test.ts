// The Climb progression engine gates ascent on a breadth quorum of checkpoints.
// These tests pin the gating rules: L3 always open, ascend only when quorum met,
// "current"/"locked"/"complete" statuses, and the next-action pointer.
import { describe, it, expect } from "vitest";
import {
  buildClimb, climbSummary, nextAction, ASCENT_QUORUM, LEVEL_MANDATE,
} from "@/lib/climb";
import { LEVELS } from "@/lib/axes";
import { CHECKPOINTS, checkpointsAfter, ORDERED_DOMAINS } from "@/lib/curriculum";
import type { Progress } from "@/lib/store";

function progress(over: Partial<Progress> = {}): Progress {
  return {
    responseLog: [], mastered: [], moduleScores: {}, fieldWork: {},
    roomsCleared: [], gauntlets: {}, conceptsRead: [], checkpointsCleared: [],
    checkpointScores: {}, signal: 0, cadence: { enabled: false, weeks: [] }, ...over,
  } as Progress;
}

// All checkpoint ids for a given level band.
function bandCheckpoints(level: (typeof LEVELS)[number]): string[] {
  return ORDERED_DOMAINS
    .map((d) => checkpointsAfter(d.id, level))
    .filter(Boolean)
    .map((c) => c!.id);
}

describe("climb structure", () => {
  it("has one stage per ladder level, in order", () => {
    const stages = buildClimb(progress());
    expect(stages.map((s) => s.level)).toEqual(LEVELS);
    stages.forEach((s, i) => expect(s.index).toBe(i));
  });

  it("every level has a role mandate with bilingual copy", () => {
    for (const lv of LEVELS) {
      const m = LEVEL_MANDATE[lv];
      expect(m.title.en.length).toBeGreaterThan(0);
      expect(m.title.es.length).toBeGreaterThan(0);
      expect(m.mandate.en.length).toBeGreaterThan(0);
      expect(m.mandate.es.length).toBeGreaterThan(0);
    }
  });
});

describe("gating", () => {
  it("empty progress: L3 current, everything above locked", () => {
    const stages = buildClimb(progress());
    expect(stages[0].status).toBe("current");
    expect(stages.slice(1).every((s) => s.status === "locked")).toBe(true);
  });

  it("does not ascend below quorum", () => {
    const l3 = bandCheckpoints("L3");
    // Clear one fewer than quorum.
    const partial = l3.slice(0, Math.max(0, ASCENT_QUORUM - 1));
    const stages = buildClimb(progress({ checkpointsCleared: partial }));
    expect(stages[0].status).toBe("current");
    expect(stages[0].ascended).toBe(false);
    expect(stages[1].status).toBe("locked");
  });

  it("ascends at quorum → next stage current, prior complete", () => {
    const l3 = bandCheckpoints("L3");
    expect(l3.length).toBeGreaterThanOrEqual(ASCENT_QUORUM);
    const quorumClear = l3.slice(0, ASCENT_QUORUM);
    const stages = buildClimb(progress({ checkpointsCleared: quorumClear }));
    expect(stages[0].status).toBe("complete");
    expect(stages[0].ascended).toBe(true);
    expect(stages[1].status).toBe("current");
    expect(stages[2].status).toBe("locked");
  });

  it("clearing all checkpoints marks every stage complete", () => {
    const all = CHECKPOINTS.map((c) => c.id);
    const stages = buildClimb(progress({ checkpointsCleared: all }));
    expect(stages.every((s) => s.status === "complete")).toBe(true);
  });
});

describe("summary + next action", () => {
  it("summary reports checkpoints-to-ascend from current stage", () => {
    const s = climbSummary(progress());
    expect(s.currentLevel).toBe("L3");
    expect(s.checkpointsToAscend).toBe(s.stages[0].quorum);
    expect(s.nextLevel).toBe("L4");
  });

  it("next action points into the current stage", () => {
    const a = nextAction(progress());
    expect(a).not.toBeNull();
    expect(a!.level).toBe("L3");
    expect(a!.lessonId.endsWith("-l3")).toBe(true);
    expect(a!.reason).toBe("start-stage");
  });

  it("next action resumes a started-but-uncleared domain", () => {
    // Read a concept in some L3 domain without clearing its checkpoint.
    const dom = ORDERED_DOMAINS[0];
    const firstConcept = dom.levels.find((l) => l.level === "L3")!.concepts[0];
    const a = nextAction(progress({ conceptsRead: [firstConcept.slug] }));
    expect(a!.reason).toBe("resume");
    expect(a!.domainId).toBe(dom.id);
  });
});
