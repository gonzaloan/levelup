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
  // Escaped via attribute selector rather than `#id`, because a slug is authored data
  // and `querySelector` would throw on one containing a CSS-special character.
  return { selector: `[id="${cssEscape(request)}"]`, clear: true };
}

/** Minimal escaping for a value interpolated into an attribute selector. */
function cssEscape(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}
