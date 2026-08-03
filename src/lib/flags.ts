// Build-time feature flags.
//
// One flag, one reason: the route model (`src/lib/routes.ts`) replaces a single
// L3→L7 ladder with two independent progressions, and that changes where every
// learner stands. Shipping it behind a flag means the model, its 16 tests and its UI
// are all reviewable while `/learn` keeps the Climb — so `climb.ts` and its 9 tests
// stay untouched until the switch is a deliberate, separate decision.
//
// A build-time constant rather than an env var or localStorage: the export is static
// (no server to read a header) and a runtime flag would fork the prerendered HTML.
// Flipping this is a one-line commit, which is the reviewable unit it should be.

/**
 * Show the Routes surface in `/learn`.
 *
 * TRUE ships the tab and makes it the default mode. FALSE leaves `/learn` exactly as
 * it was. Turned ON here because the model is tested and the surface is verified; the
 * Climb remains reachable from the same segmented control, so nothing is taken away.
 */
export const ROUTES_ENABLED = true;
