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

// Round-2 finding: a list item hard-wrapped at 80 columns had its continuation
// rendered as a dangling fragment on its own line — 27 places in the corpus.
describe("paragraphGroups: wrapped list items", () => {
  it("absorbs a continuation line into its list item", () => {
    const lines = [
      "1. Postgres becomes the paved road: managed provisioning, tested restore,",
      "   shared on-call runbook, upgrade automation.",
      "2. Redis-as-primary is the one mandatory migration.",
    ];
    const groups = paragraphGroups(lines);
    expect(groups).toEqual([[0, 1], [2]]);
  });

  it("does NOT merge two consecutive list items", () => {
    const lines = ["- first item", "- second item", "- third item"];
    expect(paragraphGroups(lines)).toEqual([[0], [1], [2]]);
  });

  it("keeps headings and table rows standalone even when text follows", () => {
    const lines = ["## A heading", "Body text that follows it.", "| a | b |", "| c | d |"];
    // The heading stands alone; the body starts its own paragraph.
    expect(paragraphGroups(lines)).toEqual([[0], [1], [2], [3]]);
  });

  it("still loses and reorders nothing", () => {
    const lines = [
      "# H", "", "- item one wrapping",
      "  onto a second line", "plain para", "more para", "| row |",
    ];
    expect(paragraphGroups(lines).flat()).toEqual(lines.map((_, i) => i));
  });
});
