import { test, expect, type Page } from "@playwright/test";

// Iteration-2 visual capture: new landing, gauntlet boss, map altitude, me.
async function noOverflow(page: Page) {
  const o = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(o, "no horizontal scroll").toBeLessThanOrEqual(2);
}

for (const locale of ["en", "es"]) {
  test(`landing ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await expect(page.locator("h1").first()).toBeVisible();
    for (const w of [360, 768, 1280]) {
      await page.setViewportSize({ width: w, height: 900 });
      await noOverflow(page);
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.screenshot({ path: `test-results/i2-landing-${locale}.png`, fullPage: true });
  });

  test(`gauntlet ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}/gauntlet/`);
    await expect(page.locator("h2").first()).toBeVisible();
    for (const w of [360, 768, 1280]) {
      await page.setViewportSize({ width: w, height: 900 });
      await noOverflow(page);
    }
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.screenshot({ path: `test-results/i2-gauntlet-${locale}.png`, fullPage: true });
  });

  test(`map ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}/map/`);
    await expect(page.locator("svg").first()).toBeVisible();
    await page.screenshot({ path: `test-results/i2-map-${locale}.png`, fullPage: true });
  });
}

test("gauntlet is playable: flag a line, classify, submit, debrief", async ({ page }) => {
  await page.goto("/en/gauntlet/");
  // Click the SQL injection line (line 20). Find by its text.
  await page.getByText("WHERE account_id = ${accountId}").click();
  await expect(page.getByText(/what class of flaw/i)).toBeVisible();
  await page.getByRole("button", { name: /^Injection/ }).click();
  await page.getByRole("button", { name: /Submit red-team/i }).click();
  await expect(page.getByText(/After-action/i)).toBeVisible();
  await page.screenshot({ path: "test-results/i2-gauntlet-debrief.png", fullPage: true });
});

test("mobile nav hamburger works", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/en/");
  await page.getByRole("button", { name: /Open menu/i }).click();
  await expect(page.getByRole("link", { name: /Star Chart/i })).toBeVisible();
  await page.screenshot({ path: "test-results/i2-mobile-nav.png" });
});
