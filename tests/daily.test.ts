import { describe, it, expect } from "vitest";
import {
  buildDaily, pickFresh, streakSummary, markDay, dayIndex, REVIEW_CAP,
  type DailyInput,
} from "@/lib/daily";
import { firstSchedule, addDays, type ReviewState } from "@/lib/review";
import { CONCEPTS, ORDERED_DOMAINS } from "@/lib/curriculum";

const base = (over: Partial<DailyInput> = {}): DailyInput => ({
  day: "2026-07-25",
  conceptsRead: [],
  reviews: {},
  unlockedThrough: "L3",
  ...over,
});

describe("pickFresh", () => {
  it("is deterministic for the same day and state", () => {
    const a = pickFresh(base());
    const b = pickFresh(base());
    expect(a?.concept.slug).toBe(b?.concept.slug);
  });

  it("never serves a concept above the unlocked band", () => {
    for (let i = 0; i < 30; i++) {
      const c = pickFresh(base({ day: addDays("2026-07-25", i) }));
      expect(c?.level).toBe("L3");
    }
  });

  it("respects within-domain prerequisites", () => {
    // Unlock everything; with nothing read, only prerequisite-free concepts qualify.
    for (let i = 0; i < 40; i++) {
      const c = pickFresh(base({ day: addDays("2026-01-01", i), unlockedThrough: "L7" }));
      expect(c?.concept.prerequisites).toEqual([]);
    }
  });

  it("rotates domains across consecutive days (interleaving)", () => {
    const domains = new Set<string>();
    for (let i = 0; i < ORDERED_DOMAINS.length; i++) {
      const c = pickFresh(base({ day: addDays("2026-07-25", i) }));
      if (c) domains.add(c.domainId);
    }
    // A full rotation cycle should touch more than one domain.
    expect(domains.size).toBeGreaterThan(1);
  });

  it("falls through to another domain when the day's domain is exhausted", () => {
    const order = ORDERED_DOMAINS.map((d) => d.id);
    const day = "2026-07-25";
    const preferred = order[dayIndex(day) % order.length];
    // Mark every concept of the preferred domain read.
    const read = CONCEPTS.filter((c) => c.domainId === preferred).map((c) => c.concept.slug);
    const c = pickFresh(base({ day, conceptsRead: read, unlockedThrough: "L7" }));
    expect(c).toBeDefined();
    expect(c!.domainId).not.toBe(preferred);
  });

  it("honors exclusions", () => {
    const first = pickFresh(base())!;
    const second = pickFresh(base({ excluded: [first.concept.slug] }));
    expect(second?.concept.slug).not.toBe(first.concept.slug);
  });

  it("returns undefined when everything eligible is read", () => {
    const all = CONCEPTS.map((c) => c.concept.slug);
    expect(pickFresh(base({ conceptsRead: all, unlockedThrough: "L7" }))).toBeUndefined();
  });
});

describe("buildDaily", () => {
  it("caps the review queue", () => {
    const slugs = CONCEPTS.slice(0, 10).map((c) => c.concept.slug);
    const reviews: Record<string, ReviewState> = {};
    for (const s of slugs) reviews[s] = { ...firstSchedule("2026-07-01"), due: "2026-07-20" };
    const brief = buildDaily(base({ reviews }));
    expect(brief.reviews.length).toBe(REVIEW_CAP);
  });

  it("marks completion when nothing is left", () => {
    const all = CONCEPTS.map((c) => c.concept.slug);
    const brief = buildDaily(base({ conceptsRead: all, unlockedThrough: "L7" }));
    expect(brief.curriculumComplete).toBe(true);
    expect(brief.fresh).toBeUndefined();
  });

  it("reports the fresh concept's domain", () => {
    const brief = buildDaily(base());
    expect(brief.domainId).toBe(brief.fresh?.domainId);
  });
});

describe("streak", () => {
  it("counts consecutive days", () => {
    const s = { days: ["2026-07-23", "2026-07-24", "2026-07-25"] };
    const sum = streakSummary(s, "2026-07-25");
    expect(sum.current).toBe(3);
    expect(sum.doneToday).toBe(true);
  });

  it("survives a single missed day (grace) without resetting", () => {
    const s = { days: ["2026-07-21", "2026-07-22", "2026-07-24"] }; // missed the 23rd
    const sum = streakSummary(s, "2026-07-24");
    expect(sum.current).toBe(3);
    // usedGrace reports the CURRENT state, so it's false here: the learner did
    // today's brief. It flips true only while a forgiven gap is what's holding
    // the run up (see "usedGrace is true exactly when yesterday was missed").
    expect(sum.usedGrace).toBe(false);
  });

  it("ends the run after two consecutive misses", () => {
    const s = { days: ["2026-07-20", "2026-07-21"] };
    expect(streakSummary(s, "2026-07-25").current).toBe(0);
  });

  it("total never decreases even when the streak breaks", () => {
    const s = { days: ["2026-06-01", "2026-06-02", "2026-07-25"] };
    const sum = streakSummary(s, "2026-07-25");
    expect(sum.current).toBe(1);
    expect(sum.total).toBe(3);
    expect(sum.thisMonth).toBe(1);
  });

  it("tracks the longest run independently of the current one", () => {
    const s = { days: ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-07-25"] };
    const sum = streakSummary(s, "2026-07-25");
    expect(sum.longest).toBe(4);
    expect(sum.current).toBe(1);
  });

  it("markDay is idempotent and sorted", () => {
    let s = { days: ["2026-07-25"] };
    s = markDay(s, "2026-07-25");
    s = markDay(s, "2026-07-20");
    expect(s.days).toEqual(["2026-07-20", "2026-07-25"]);
  });

  it("is empty-safe", () => {
    const sum = streakSummary({ days: [] }, "2026-07-25");
    expect(sum).toMatchObject({ current: 0, longest: 0, total: 0, doneToday: false });
  });

  // ── The forgiveness rule ────────────────────────────────────────────────
  // The rule is deliberately uncapped: any SINGLE missed day is forgiven, two in a
  // row is not. Three attempts at a per-week cap all made the metric non-monotone
  // (adding an earlier completed day could LOWER the streak), which is worse than
  // being generous — see the note in daily.ts. So an every-other-day learner does
  // keep a long run, and that is the intended, defensible behaviour.
  it("keeps an every-other-day learner's run alive, and says so honestly", () => {
    const days = Array.from({ length: 30 }, (_, i) => addDays("2026-01-01", i * 2));
    const today = days[days.length - 1];
    const sum = streakSummary({ days }, today);
    expect(sum.current).toBe(30);
    expect(sum.total).toBe(30);   // the exact metric agrees — they did practise 30 days
  });

  it("forgives one skip a week indefinitely", () => {
    // Three weeks of daily practice with one skip each week.
    const days: string[] = [];
    for (let d = 0; d < 21; d++) if (d % 7 !== 3) days.push(addDays("2026-03-01", d));
    const today = addDays("2026-03-01", 20);
    expect(streakSummary({ days }, today).current).toBe(days.length);
  });

  it("still ends the run after two consecutive misses regardless of budget", () => {
    const days = Array.from({ length: 20 }, (_, i) => addDays("2026-05-01", i));
    // Two-day hole, then resume: the run restarts rather than being forgiven.
    const after = [...days, addDays("2026-05-01", 22), addDays("2026-05-01", 23)];
    expect(streakSummary({ days: after }, addDays("2026-05-01", 23)).current).toBe(2);
  });

  it("usedGrace describes the present, not the run's history", () => {
    // A single skip 30 days ago must not still claim a rest day is holding the run.
    const days: string[] = ["2026-06-01"];
    for (let d = 3; d <= 32; d++) days.push(addDays("2026-06-01", d - 1));
    const today = days[days.length - 1];
    const sum = streakSummary({ days }, today);
    expect(sum.doneToday).toBe(true);
    expect(sum.usedGrace).toBe(false);
  });

  // Regression: `current` and `longest` were computed by two different walks
  // (backward and forward) that measured the grace budget over different spans, so
  // the backward one was more permissive and could report a CURRENT run longer
  // than the LONGEST run ever — two impossible numbers side by side in the UI.
  it("never reports a current run longer than the longest run", () => {
    const cases: string[][] = [
      ["2026-01-04", "2026-01-06", "2026-01-08", "2026-01-09"], // the reported case
      ["2026-02-01", "2026-02-03", "2026-02-05", "2026-02-07", "2026-02-08"],
      ["2026-03-01", "2026-03-02", "2026-03-05", "2026-03-07", "2026-03-09"],
    ];
    for (const days of cases) {
      const today = days[days.length - 1];
      const s = streakSummary({ days }, today);
      expect(s.current, days.join(",")).toBeLessThanOrEqual(s.longest);
    }
  });

  it("holds current <= longest <= total over a deterministic sweep", () => {
    // Deterministic pseudo-random histories (no Math.random — seeded LCG) so a
    // failure is reproducible rather than a flake.
    let seed = 12345;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let trial = 0; trial < 400; trial++) {
      const days: string[] = [];
      let cursor = 0;
      for (let k = 0; k < 25; k++) {
        cursor += 1 + Math.floor(next() * 4); // gaps of 1..4 days
        days.push(addDays("2026-01-01", cursor));
      }
      for (const offset of [0, 1, 2, 3]) {
        const today = addDays(days[days.length - 1], offset);
        const s = streakSummary({ days }, today);
        expect(s.current, `trial ${trial} offset ${offset}`).toBeLessThanOrEqual(s.longest);
        expect(s.longest).toBeLessThanOrEqual(s.total);
      }
    }
  });

  // Regression: greedy segmentation spent a run's grace at the first opportunity,
  // so ADDING an earlier completed day could LOWER the reported streak (6 days →
  // current 3, but the same history without its first day → current 5). A metric
  // that punishes you for having practised more is indefensible.
  it("adding an earlier completed day never lowers the streak", () => {
    const days = ["2026-01-01", "2026-01-03", "2026-01-04", "2026-01-06", "2026-01-07", "2026-01-08"];
    const today = "2026-01-08";
    const withFirst = streakSummary({ days }, today);
    const withoutFirst = streakSummary({ days: days.slice(1) }, today);
    expect(withFirst.current).toBeGreaterThanOrEqual(withoutFirst.current);
    expect(withFirst.longest).toBeGreaterThanOrEqual(withoutFirst.longest);
  });

  it("is monotone: a longer history never shortens current or longest", () => {
    let seed = 987654321;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let trial = 0; trial < 200; trial++) {
      const days: string[] = [];
      let cursor = 0;
      for (let k = 0; k < 18; k++) {
        cursor += 1 + Math.floor(next() * 3); // gaps of 1..3 — where grace matters
        days.push(addDays("2026-02-01", cursor));
      }
      const today = days[days.length - 1];
      const full = streakSummary({ days }, today);
      // Dropping any prefix must never IMPROVE the numbers.
      for (let cut = 1; cut < 5; cut++) {
        const shorter = streakSummary({ days: days.slice(cut) }, today);
        expect(full.current, `trial ${trial} cut ${cut}`).toBeGreaterThanOrEqual(shorter.current);
        expect(full.longest, `trial ${trial} cut ${cut}`).toBeGreaterThanOrEqual(shorter.longest);
      }
    }
  });

  it("ignores day keys dated after today (clock skew / merged history)", () => {
    // A device whose clock ran forward, or a history merged from another timezone,
    // used to start a new run in the future and reset `current` to 1.
    const days = Array.from({ length: 6 }, (_, i) => addDays("2026-04-01", i)); // …to 04-06
    const withFuture = [...days, "2026-04-20"];
    const today = "2026-04-06";
    expect(streakSummary({ days: withFuture }, today).current).toBe(6);
    expect(streakSummary({ days: withFuture }, today).total).toBe(6); // future day not counted
  });

  it("usedGrace is true exactly when yesterday was missed and a grace day is left", () => {
    // An unbroken week, so the run's grace day is still unspent.
    const days = Array.from({ length: 7 }, (_, i) => addDays("2026-07-18", i)); // …to the 24th
    expect(streakSummary({ days }, "2026-07-24").usedGrace).toBe(false); // done today
    expect(streakSummary({ days }, "2026-07-25").usedGrace).toBe(false); // yesterday (24th) done
    // Only now is a forgiven gap holding the run up: the 25th was missed.
    expect(streakSummary({ days }, "2026-07-26").usedGrace).toBe(true);
    expect(streakSummary({ days }, "2026-07-26").current).toBe(7);
  });

  it("two consecutive misses end the run, however good the history was", () => {
    // A long unbroken run still dies after two missed days in a row — the one hard
    // edge in the rule, and the reason the streak means anything at all.
    const days = Array.from({ length: 40 }, (_, i) => addDays("2026-06-01", i)); // …to 07-10
    expect(streakSummary({ days }, "2026-07-10").current).toBe(40); // done today
    expect(streakSummary({ days }, "2026-07-11").current).toBe(40); // yesterday
    expect(streakSummary({ days }, "2026-07-12").current).toBe(40); // one missed, forgiven
    expect(streakSummary({ days }, "2026-07-13").current).toBe(0);  // two in a row — over
    expect(streakSummary({ days }, "2026-07-13").total).toBe(40);   // but nothing is lost
  });
});
