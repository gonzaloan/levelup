// Which element a requested scroll should land on, as a pure decision.
//
// WHY THIS IS ITS OWN MODULE. `CodexView` asks for a scroll from three places (a hash
// arrival, a family chip in a search result, a cluster button) and the scroll must
// happen after React commits the new cluster, not a guessed frame earlier. The first
// version guessed one `requestAnimationFrame`, which loses under load: on a cold deep
// link at 4x CPU throttle the frame ran before the commit, `getElementById` returned
// null, and the scroll was silently skipped. Measured over 60 cold loads — 1x: 15/15
// landed, 4x: 2/15, 8x: 0/15, 20x: 0/15.
//
// The fix was an effect keyed on the committed state. But the GUARD for it lived as a
// regex over the component source, and that guard was measured blind: reinstating the
// `requestAnimationFrame` leaves 513 characters between it and `scrollIntoView`, and the
// negative assertion only looked 200 characters ahead. So the very defect the assertion
// existed to prohibit could return with the gate green — the third time a source-proximity
// assert here broke or went blind on a correct refactor.
//
// CLAUDE.md already prescribes the answer for exactly this: "either extract the seam or
// assert the wiring in source", and source has now failed three times. So the decision
// lives here, pure and unit-testable without a DOM, and the component keeps only the
// DOM call it cannot avoid.

/** What a caller asks for. `"cluster-title"` is a sentinel; anything else is an id. */
export const CLUSTER_TITLE = "cluster-title";

export type ScrollRequest = string | null;

export interface ScrollPlan {
  /** A CSS selector for the element to scroll to, or null to do nothing. */
  selector: string | null;
  /** Always true: a request is consumed whether or not it resolved. */
  clear: boolean;
}

/**
 * Turn a pending request into a plan.
 *
 * `clear` is unconditional, and that is load-bearing in two ways a reader will hit
 * before they hit the one the code first documented:
 *
 *   1. Setting the same request twice is a React bailout — no re-render, no effect, no
 *      scroll. So a reader who clicks the SAME family chip twice would not move the
 *      second time, which is the missed-event defect that `history.replaceState` was
 *      introduced to avoid one layer up, reappearing in the state layer.
 *   2. An uncleared request re-fires on the next unrelated render, so returning from
 *      `path` to `browse` produced a phantom scroll.
 *
 * A request that does not resolve is still consumed: a target absent after the commit is
 * not going to appear later, and holding it would land the reader somewhere they did not
 * ask for once an unrelated render came along.
 */
export function scrollPlan(request: ScrollRequest): ScrollPlan {
  if (!request) return { selector: null, clear: false };
  if (request === CLUSTER_TITLE) {
    // Scoped to `.cx-cluster`, which only browse mode renders, so this cannot match a
    // heading inside a search result that is about to unmount.
    return { selector: ".cx-cluster .cx-cluster-title", clear: true };
  }
  // An id, from a caller that already validated the slug against ENTRY_BY_SLUG.
  //
  // `CSS.escape` rather than a hand-rolled replace. The first version escaped quotes and
  // backslashes, which is enough for every shipped slug (all 118 are `^[a-z0-9-]+$`, and
  // `merge-codex.cjs` enforces that) but was sold in a comment as complete insurance and
  // was not: a raw newline, carriage return or form feed still produced a selector that
  // throws `SyntaxError` in Chromium, because a CSS string cannot contain an unescaped
  // newline. `CSS.escape` handles all three and every other case, is available in every
  // browser this project supports, and removes a hand-maintained escape list — which is
  // the same trade the primer contract makes against per-locale blacklists.
  return { selector: `#${cssEscapeSafe(request)}`, clear: true };
}

/**
 * `CSS.escape`, with a fallback for the non-browser path.
 *
 * `scrollPlan` is a pure module and gets unit-tested in node, where `CSS` does not
 * exist. The fallback escapes the characters that can break a selector rather than
 * pretending to be a full implementation, and it is never the branch a browser takes.
 */
function cssEscapeSafe(value: string): string {
  const g = globalThis as { CSS?: { escape?: (s: string) => string } };
  if (typeof g.CSS?.escape === "function") return g.CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch.codePointAt(0)!.toString(16)} `);
}
