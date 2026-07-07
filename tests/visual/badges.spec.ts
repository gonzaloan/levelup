import { test, expect, type Page } from "@playwright/test";

// Seed some progress so earned badges light up, then capture /me trophy shelf +
// an achievement page in both themes.
async function seed(page: Page) {
  await page.addInitScript(() => {
    const prog = {
      responseLog: [], mastered: [], moduleScores: {}, fieldWork: {},
      roomsCleared: [], gauntlets: { g: { firstScore: 0.8, bestScore: 0.9, attempts: 1 } },
      conceptsRead: Array.from({ length: 12 }, (_, i) => `c${i}`),
      checkpointsCleared: ["l3", "l4", "l5", "l6", "l7"].map((l) => `chk-technical-depth-${l}`),
      checkpointScores: {}, signal: 120, cadence: { enabled: false, weeks: [] },
    };
    window.localStorage.setItem("levelup.v1", JSON.stringify(prog));
  });
}

test("me trophy shelf shows earned + locked badges (studio)", async ({ page }) => {
  await seed(page);
  await page.goto("/en/me/");
  await page.waitForTimeout(900);
  await expect(page.locator(".badge-shelf")).toBeVisible();
  const earned = page.locator('.badge-tile[data-earned="true"]');
  const locked = page.locator('.badge-tile[data-earned="false"]');
  expect(await earned.count()).toBeGreaterThanOrEqual(3); // first, gauntlet, ten-concepts, domain-technical-depth
  expect(await locked.count()).toBeGreaterThan(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/badges-me-studio.png", fullPage: true });
});

test("me trophy shelf pixel theme", async ({ page }) => {
  await seed(page);
  await page.addInitScript(() => window.localStorage.setItem("levelup.theme", "pixel"));
  await page.goto("/en/me/");
  await page.waitForTimeout(900);
  await expect(page.locator(".badge-shelf")).toBeVisible();
  await page.screenshot({ path: "test-results/badges-me-pixel.png", fullPage: true });
});

test("achievement page renders with share actions", async ({ page }) => {
  await page.goto("/en/achievement/domain-technical-depth/");
  await page.waitForTimeout(700);
  await expect(page.locator(".achievement-art")).toBeVisible();
  await expect(page.getByRole("button", { name: /Share on LinkedIn/i })).toBeVisible();
  await page.screenshot({ path: "test-results/achievement-page.png", fullPage: true });
});
