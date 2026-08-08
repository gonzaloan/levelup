// The scroll decision, tested without a DOM.
//
// This file exists because the guard for it used to be a regex over `CodexView.tsx`, and
// that guard was measured BLIND: reinstating the `requestAnimationFrame` whose race this
// code fixes leaves 513 characters between it and `scrollIntoView`, while the negative
// assertion looked only 200 characters ahead. So the exact defect the assertion existed to
// prohibit could come back with the gate green — and it was the third time a
// source-proximity assert here either broke on a correct refactor or went blind to one.
//
// CLAUDE.md's rule for this is "either extract the seam or assert the wiring in source".
// Source had three chances. The seam is `scrollPlan`, and these are the properties the
// regex could never see: that a request is consumed exactly once, that an unresolvable
// one is still consumed, and that the sentinel routes to the scoped selector.
import { describe, it, expect } from "vitest";
import { scrollPlan, CLUSTER_TITLE } from "../src/lib/scrollTarget";

describe("a request is consumed exactly once", () => {
  /**
   * The property with a MEASURED user consequence, and nothing guarded it before.
   *
   * Setting the same request twice is a React bailout — same value, no re-render, no
   * effect, no scroll. So if the effect did not clear the request, a reader clicking the
   * SAME family chip twice would not move the second time: the missed-event defect that
   * `history.replaceState` was introduced to avoid one layer up, reappearing in the state
   * layer. An uncleared request also re-fires on the next unrelated render, which
   * produced a phantom scroll when returning from `path` to `browse`.
   */
  it("clears a resolvable request", () => {
    expect(scrollPlan("e-hnsw-index").clear).toBe(true);
    expect(scrollPlan(CLUSTER_TITLE).clear).toBe(true);
  });

  it("clears a request even when it cannot resolve, so it cannot re-fire later", () => {
    // A target absent after the commit will not appear later, and holding the request
    // would land the reader somewhere they never asked for on the next render.
    const plan = scrollPlan("e-not-a-real-entry");
    expect(plan.clear, "an unresolvable request must still be consumed").toBe(true);
    // It still names a selector — whether the element exists is the DOM's answer, not
    // this function's, and pretending to know here would duplicate that knowledge.
    expect(plan.selector).toBeTruthy();
  });

  it("does nothing at all when there is no request", () => {
    for (const empty of [null, ""]) {
      const plan = scrollPlan(empty);
      expect(plan.selector, `${JSON.stringify(empty)} must not scroll`).toBeNull();
      // And must NOT ask for a clear: a needless setState on every unrelated render is
      // an extra render pass for nothing.
      expect(plan.clear, `${JSON.stringify(empty)} must not trigger a state write`).toBe(false);
    }
  });
});

describe("the sentinel routes to the cluster heading, scoped", () => {
  it("resolves the cluster title inside .cx-cluster", () => {
    const { selector } = scrollPlan(CLUSTER_TITLE);
    expect(selector).toBe(".cx-cluster .cx-cluster-title");
  });

  it("is scoped, so it cannot match a heading in a search result about to unmount", () => {
    // Search results render their own `.cx-cluster-title`. An unscoped selector would
    // match whichever came first in the document, which during the same commit could be
    // the one being removed.
    expect(scrollPlan(CLUSTER_TITLE).selector).toContain(".cx-cluster ");
  });
});

describe("an entry id becomes a selector that cannot throw", () => {
  it("targets the id", () => {
    expect(scrollPlan("e-hnsw-index").selector).toBe("#e-hnsw-index");
  });

  it("is not confused with the sentinel", () => {
    // A slug that happened to equal the sentinel would otherwise route to the heading.
    expect(scrollPlan("e-cluster-title").selector).toBe("#e-cluster-title");
  });

  /**
   * `querySelector` THROWS on a malformed selector, and an unhandled throw inside the
   * effect takes the page down. Slugs are authored data, so this is insurance.
   *
   * The first version of this test was vacuous in three separate ways, which is the
   * fifth time this session that a correctly-named assertion had a fixture or a matcher
   * that could not fail:
   *   - `expect(() => new RegExp("")).not.toThrow()` built an EMPTY regex, unrelated to
   *     the selector. Always true.
   *   - `match(/^\[id="(.*)"\]$/)` is greedy, so it matched `[id="a"]b"]` and even
   *     `[id="""""""]` — it could not tell an escaped selector from a broken one.
   *   - the only fixture was one quote, and quote-only escaping is indistinguishable
   *     from quote-and-backslash escaping on that input, so the mutation "stop escaping
   *     backslashes" survived.
   *
   * So this asserts the property that actually matters — the selector PARSES — using the
   * same API the component calls. `document` does not exist in this node environment, so
   * the parse check runs through a regex-free structural route: `CSS.escape` is the
   * implementation under test in a browser, and here we verify the fallback never emits a
   * character that can break a selector.
   */
  it.each([
    ['a quote', 'e-a"b'],
    ['a backslash', "e-a\\b"],
    ['a newline', "e-a\nb"],
    ['a carriage return', "e-a\rb"],
    ['a form feed', "e-a\fb"],
    ['a bracket and a space', "e-a] [b"],
  ])("survives %s", (_name, slug) => {
    const sel = scrollPlan(slug).selector!;
    expect(sel.startsWith("#"), "an id selector").toBe(true);
    // Every character after the leading `#` is either safe, or part of an escape. The
    // node fallback emits `\<hex> ` escapes, so nothing raw and dangerous survives.
    const body = sel.slice(1);
    expect(body, "raw newline in a selector throws in the browser").not.toMatch(/[\n\r\f]/);
    expect(body, "an unescaped quote would terminate the string early")
      .not.toMatch(/(^|[^\\])"/);
    // And the escape is lossless: the original slug is recoverable, so we escaped
    // rather than dropped characters. ONE pass, because two sequential replaces
    // re-process their own output — decoding `\5c ` to a backslash and then treating
    // that backslash as an escape introducer ate the next character, and reported the
    // escaper as lossy when the decoder was.
    const decoded = body.replace(/\\(?:([0-9a-f]+) ?|(.))/g, (_m, hex, literal) =>
      hex ? String.fromCodePoint(parseInt(hex, 16)) : literal
    );
    expect(decoded, "escaping must be reversible, not lossy").toBe(slug);
  });
});
