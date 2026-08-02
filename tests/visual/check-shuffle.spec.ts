import { test, expect, type Page } from "@playwright/test";

/** The shape this spec needs from a shipped match check. */
interface MatchLike {
  kind: string;
  left: { en: string }[];
  right: { en: string }[];
  pairs: [number, number][];
}

// Does the shuffle survive the trip through the real DOM?
//
// `tests/check-integrity.test.ts` proves the DISPLAY LAYER refuses to hand the
// answer to positional play. That is a unit test over pure functions — it cannot
// tell whether the players actually render in that order, nor whether a learner
// who reasons correctly can still express the right answer through the UI. Both
// are needed: a shuffle that the component ignores is not a fix, and a shuffle
// that breaks grading is worse than the bug.
//
// So these tests drive the browser twice over the same check:
//   1. play it POSITIONALLY (link row 1 to row 1, tap the bank left to right) and
//      require the app to mark it wrong;
//   2. play it CORRECTLY by reading the rendered text and require a pass.

async function settle(page: Page, ms = 500) { await page.waitForTimeout(ms); }

/** Walk a lesson to its practice stage, where the formative checks live. */
async function reachPractice(page: Page, lessonId: string) {
  await page.goto(`/en/lesson/${lessonId}/`);
  await settle(page, 700);
  await page.getByRole("button", { name: /^Begin/ }).click();
  await settle(page, 300);
  for (let i = 0; i < 16; i++) {
    const next = page.getByRole("button", { name: /Got it — continue|Start the check/ });
    if (!(await next.count())) break;
    await next.first().click();
    await page.waitForTimeout(180);
  }
  const skipRecall = page.getByRole("button", { name: /Skip recall/i });
  if (await skipRecall.count()) { await skipRecall.first().click(); await settle(page, 300); }
  for (let q = 0; q < 6 && (await page.locator(".check").count()) === 0; q++) {
    const options = page.locator(".card .btn");
    if (!(await options.count())) break;
    await options.nth(0).click().catch(() => {});
    await page.waitForTimeout(220);
    const next = page.getByRole("button", { name: /^(Next|Continue)/i }).first();
    if (await next.count()) { await next.click(); await page.waitForTimeout(260); }
  }
  await expect(page.locator(".check").first()).toBeVisible();
}

test.describe("the shuffle is real in the DOM", () => {
  test("a match check does not fall to linking row 1 to row 1", async ({ page }) => {
    // systems-architecture-l4 carries match checks whose authored key is the
    // identity permutation, which is what made this exploitable.
    await reachPractice(page, "systems-architecture-l4");

    const match = page.locator(".match").first();
    if (!(await match.count())) {
      test.skip(true, "this lesson's first practice check is not a match; covered by the unit test");
      return;
    }

    const left = match.locator(".match-left .match-item");
    const right = match.locator(".match-right .match-item");
    const n = await left.count();
    expect(n).toBeGreaterThanOrEqual(3);   // the content floor we now enforce

    // Positional play: left row i to right row i, straight down.
    for (let i = 0; i < n; i++) {
      await left.nth(i).click();
      await page.waitForTimeout(90);
      await right.nth(i).click();
      await page.waitForTimeout(90);
    }

    const submit = page.getByRole("button", { name: /Check|Submit|Reveal/i }).first();
    await expect(submit).toBeEnabled();
    await submit.click();
    await settle(page, 400);

    // At least one link must be marked wrong. The player sets data-state on each
    // left item when revealed, so read the DOM rather than trusting a score string.
    const bad = await match.locator('.match-left .match-item[data-state="bad"]').count();
    expect(bad, "positional linking was graded as fully correct — the shuffle is not reaching the DOM").toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/shuffle-match-positional.png", fullPage: true });
  });

  test("a cloze check does not fall to tapping the bank left to right", async ({ page }) => {
    await reachPractice(page, "technical-depth-l5");

    const cloze = page.locator(".cloze").first();
    if (!(await cloze.count())) {
      test.skip(true, "this lesson's first practice check is not a cloze; covered by the unit test");
      return;
    }

    const blanks = cloze.locator(".cloze-blank");
    const tokens = cloze.locator(".cloze-token");
    const nBlanks = await blanks.count();
    expect(nBlanks).toBeGreaterThan(0);

    // Positional play: tap bank tokens left to right. `place()` auto-advances to
    // the next empty blank, so token i lands in blank i.
    for (let i = 0; i < nBlanks; i++) {
      const enabled = tokens.nth(i);
      if (await enabled.isEnabled()) { await enabled.click(); await page.waitForTimeout(90); }
    }

    const submit = page.getByRole("button", { name: /Check|Submit|Reveal/i }).first();
    if (await submit.isEnabled()) {
      await submit.click();
      await settle(page, 400);
      const bad = await cloze.locator('.cloze-blank[data-state="bad"]').count();
      expect(bad, "left-to-right tapping filled every blank correctly — the bank is not shuffled").toBeGreaterThan(0);
    }

    await page.screenshot({ path: "test-results/shuffle-cloze-positional.png", fullPage: true });
  });

  test("a learner who reads the options can still get a match right", async ({ page }) => {
    // The other half of the contract. A shuffle that makes the correct answer
    // unreachable would pass every exploit test above and be a worse bug.
    await reachPractice(page, "systems-architecture-l4");

    const match = page.locator(".match").first();
    if (!(await match.count())) {
      test.skip(true, "no match check on this lesson's practice stage");
      return;
    }

    // Read the rendered text of both columns, then resolve the correct pairing
    // from the shipped content — the same thing a learner does by reasoning.
    const leftTexts = await match.locator(".match-left .match-item").allInnerTexts();
    const rightTexts = await match.locator(".match-right .match-item").allInnerTexts();

    // Read the shipped JSON directly. Importing `src/lib/checks` here fails:
    // Playwright's transform does not resolve the `@/` path alias that module
    // uses for its own JSON import.
    const { readFileSync } = await import("node:fs");
    const CHECKS = JSON.parse(readFileSync("src/content/data/checks.json", "utf8")).checks as MatchLike[];
    const clean = (s: string) => s.replace(/^\d+\s*/, "").replace(/\s+\d+$/, "").trim();
    const item = CHECKS.find((c) => c.kind === "match"
      && c.left.length === leftTexts.length
      && c.left.every((l) => leftTexts.some((t) => clean(t) === l.en.trim())));
    expect(item, "could not identify the rendered match check in the content").toBeTruthy();
    if (!item) return;

    // Authored index -> the display row it was rendered at.
    const leftRow = new Map(item.left.map((l, i) => [i, leftTexts.findIndex((t) => clean(t) === l.en.trim())]));
    const rightRow = new Map(item.right.map((r, i) => [i, rightTexts.findIndex((t) => clean(t) === r.en.trim())]));

    for (const [l, r] of item.pairs) {
      const lr = leftRow.get(l)!;
      const rr = rightRow.get(r)!;
      expect(lr, "a left item was not found in the DOM").toBeGreaterThanOrEqual(0);
      expect(rr, "a right item was not found in the DOM").toBeGreaterThanOrEqual(0);
      await match.locator(".match-left .match-item").nth(lr).click();
      await page.waitForTimeout(90);
      await match.locator(".match-right .match-item").nth(rr).click();
      await page.waitForTimeout(90);
    }

    const submit = page.getByRole("button", { name: /Check|Submit|Reveal/i }).first();
    await submit.click();
    await settle(page, 400);

    const bad = await match.locator('.match-left .match-item[data-state="bad"]').count();
    expect(bad, "the correct pairing was graded as wrong — the shuffle broke the mapping back to authored indices").toBe(0);

    await page.screenshot({ path: "test-results/shuffle-match-correct.png", fullPage: true });
  });
});
