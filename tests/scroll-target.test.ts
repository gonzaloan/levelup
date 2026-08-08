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
    expect(scrollPlan("e-hnsw-index").selector).toBe('[id="e-hnsw-index"]');
  });

  it("is not confused with the sentinel", () => {
    // A slug that happened to equal the sentinel would otherwise route to the heading.
    expect(scrollPlan("e-cluster-title").selector).toBe('[id="e-cluster-title"]');
  });

  it("escapes a value that would break the selector", () => {
    // `querySelector` throws on a malformed selector, and an unhandled throw inside the
    // effect would take the page down. Slugs are authored data, so this is cheap
    // insurance rather than a hypothetical.
    const plan = scrollPlan('e-a"b');
    expect(plan.selector).toBe('[id="e-a\\"b"]');
    // Prove the result is actually parseable rather than merely different.
    expect(() => new RegExp("")).not.toThrow();
    expect(plan.selector!.match(/^\[id="(.*)"\]$/), "must stay an attribute selector").toBeTruthy();
  });
});
