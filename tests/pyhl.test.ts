import { describe, expect, it } from "vitest";
import { tokenize } from "@/lib/practice/pyhl";

const kinds = (src: string) => tokenize(src).filter((t) => t.k).map((t) => `${t.k}:${t.s}`);

describe("python highlighter", () => {
  it("round-trips the text exactly (the overlay must line up with the textarea)", () => {
    const src = "def f(xs: list[int]) -> int:\n    # sum\n    s = 'a#b' + \"\"\"x\ny\"\"\"\n    return sum(xs) + 1_000 + 2.5e3\n";
    expect(tokenize(src).map((t) => t.s).join("")).toBe(src);
  });
  it("colors keywords, builtins, def names, strings, numbers, comments and constants", () => {
    expect(kinds("def best(nums):\n    return max(nums) if nums else None  # done")).toEqual([
      "kw:def", "fn:best", "kw:return", "bi:max", "kw:if", "kw:else", "const:None", "com:# done",
    ]);
    expect(kinds("x = f'{a}' + r'\\d' + 42")).toEqual(["str:f'{a}'", "str:r'\\d'", "num:42"]);
  });
  it("a '#' inside a string is not a comment, and an unclosed string still round-trips", () => {
    expect(kinds("s = '# not a comment'")).toEqual(["str:'# not a comment'"]);
    const half = "s = 'unclosed\nnext = 1";
    expect(tokenize(half).map((t) => t.s).join("")).toBe(half);
  });
});
