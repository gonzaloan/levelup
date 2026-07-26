import { describe, it, expect } from "vitest";
import { leadAndRest } from "@/components/lesson/util";

describe("leadAndRest", () => {
  it("keeps a single sentence whole even when long", () => {
    const s = "A " + "very ".repeat(60) + "long sentence.";
    expect(leadAndRest(s)).toEqual([s, ""]);
  });
  it("splits at a sentence boundary once the budget is spent", () => {
    const [lead, rest] = leadAndRest("One two three. Four five six. Seven eight.", 4);
    expect(lead).toBe("One two three.");
    expect(rest).toBe("Four five six. Seven eight.");
  });
  it("takes several short sentences while under budget", () => {
    const [lead, rest] = leadAndRest("A b. C d. " + "x ".repeat(40) + "end.", 8);
    expect(lead).toBe("A b. C d.");
    expect(rest).toContain("end.");
  });
  it("loses no words", () => {
    const src = "First one here. Second one here. Third one is quite a lot longer than the others are.";
    const [lead, rest] = leadAndRest(src, 6);
    expect((lead + " " + rest).trim().split(/\s+/)).toEqual(src.split(/\s+/));
  });
  it("handles a paragraph with no terminator", () => {
    expect(leadAndRest("no terminator here")).toEqual(["no terminator here", ""]);
  });
});
