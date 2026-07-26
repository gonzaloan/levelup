import { describe, it, expect } from "vitest";
import { paragraphGroups } from "@/components/lesson/CodeView";

// The grouping is only safe if it is a pure repartition of the line indices:
// every line appears exactly once, in order. Otherwise a memo could silently
// lose a sentence, or an annotation could point at the wrong text.
describe("paragraphGroups", () => {
  const lines = [
    "# Bet: checkout latency",
    "",
    "Everyone agrees performance matters, so nothing",
    "moves: it is no one's job.",
    "",
    "## 1. Shape",
    "- 3 engineers for 2 quarters",
    "- named, not as available",
    "| a | b |",
    "Plain continuation one",
    "plain continuation two",
  ];

  it("loses and reorders nothing", () => {
    const flat = paragraphGroups(lines).flat();
    expect(flat).toEqual(lines.map((_, i) => i));
  });

  it("joins only continuation lines", () => {
    const groups = paragraphGroups(lines);
    const multi = groups.filter((g) => g.length > 1);
    expect(multi).toEqual([[2, 3], [9, 10]]);
  });

  it("keeps headings, list items, table rows and blanks standalone", () => {
    for (const g of paragraphGroups(lines)) {
      if (g.length > 1) continue;
      // every single-line group is either structural or adjacent to structure
      expect(g).toHaveLength(1);
    }
    const groups = paragraphGroups(lines);
    expect(groups).toContainEqual([0]);   // heading
    expect(groups).toContainEqual([6]);   // list item
    expect(groups).toContainEqual([8]);   // table row
  });

  it("handles an empty artifact", () => {
    expect(paragraphGroups([])).toEqual([]);
  });
});
