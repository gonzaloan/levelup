import { describe, it, expect } from "vitest";
import { tokenizeInline, tokenizeLine, freshState, headingLevel } from "@/components/lesson/inline-md";

const plain = (tokens: { value: string }[]) => tokens.map((t) => t.value).join("");

describe("tokenizeInline", () => {
  it("renders bold within one line and leaves no markers", () => {
    const out = tokenizeLine("a **b** c");
    expect(plain(out)).toBe("a b c");
    expect(out.find((t) => t.kind === "bold")?.value).toBe("b");
  });

  it("carries an unclosed bold across a hard-wrapped line — the real corpus case", () => {
    // Authored artifacts wrap at ~80 cols, so "**Agreement is the / problem**"
    // is normal. A per-line parser leaves asterisks visible in both halves.
    const state = freshState();
    const first = tokenizeInline("it loses every cycle. **Agreement is the", state);
    expect(state.bold).toBe(true);
    const second = tokenizeInline(" problem** — it costs nothing.", state);
    expect(state.bold).toBe(false);
    const joined = plain(first) + plain(second);
    expect(joined).not.toContain("*");
    expect(joined).toBe("it loses every cycle. Agreement is the problem — it costs nothing.");
    // And both halves are actually emphasised, not just stripped.
    expect(first.some((t) => t.kind === "bold")).toBe(true);
    expect(second.some((t) => t.kind === "bold")).toBe(true);
  });

  it("treats ** inside inline code as literal", () => {
    const out = tokenizeLine("use `a ** b` here");
    expect(plain(out)).toBe("use a ** b here");
    expect(out.find((t) => t.kind === "code")?.value).toBe("a ** b");
  });

  it("carries an unclosed code span across lines too", () => {
    const state = freshState();
    tokenizeInline("run `terraform", state);
    expect(state.code).toBe(true);
    tokenizeInline(" validate` first", state);
    expect(state.code).toBe(false);
  });

  it("loses no characters on a line with no markup", () => {
    const src = "plain text with (parens) and 2.1s and $9,000";
    expect(plain(tokenizeLine(src))).toBe(src);
  });

  it("handles an empty line", () => {
    expect(tokenizeLine("")).toEqual([]);
  });
});

describe("headingLevel", () => {
  it("reads the level and ignores non-headings", () => {
    expect(headingLevel("# Bet")).toBe(1);
    expect(headingLevel("## 1. Shape")).toBe(2);
    expect(headingLevel("#nospace")).toBe(0);
    expect(headingLevel("plain")).toBe(0);
  });
});
