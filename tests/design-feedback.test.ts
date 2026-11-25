import { describe, expect, it } from "vitest";
import { feedbackText } from "@/lib/design-round";

const rubric = [
  { id: "req", title: "Requirements", levels: ["a1", "a2", "a3", "a4"], study: [{ id: "design-framework", title: "Framework" }] },
  { id: "est", title: "Estimation", levels: ["b1", "b2", "b3", "b4"], study: [{ id: "back-of-envelope", title: "Envelope" }] },
];
const base = { title: "Rate limiter", minutes: 41, locale: "en" as const, origin: "https://x.dev", rubric, phases: [{ id: "req", title: "Requirements" }, { id: "est", title: "Estimates" }] };

describe("peer mock feedback", () => {
  it("lists each score with its level, the average, the weakest dimension and its study links", () => {
    const text = feedbackText({ ...base, scores: { req: 3, est: 2 }, notes: { req: "Asked about\nburst limits ", est: "" } });
    expect(text).toContain("Requirements: 3/4 · a3");
    expect(text).toContain("Estimation: 2/4 · b2");
    expect(text).toContain("Average: 2.5/4");
    expect(text).toContain("To work on: Estimation");
    expect(text).toContain("https://x.dev/en/c/back-of-envelope/");
    expect(text).toContain("- Requirements: Asked about / burst limits");
    expect(text).not.toContain("- Estimates");
  });
  it("names nothing to work on when every dimension is top level", () => {
    const text = feedbackText({ ...base, locale: "es", scores: { req: 4, est: 4 }, notes: {} });
    expect(text).toContain("Promedio: 4.0/4");
    expect(text).not.toContain("A trabajar");
  });
});
