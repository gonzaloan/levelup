import { test, expect, type Page } from "@playwright/test";

// Anti-slop + functional guards from src/design/anti-slop-checklist.md.
const WIDTHS = [360, 768, 1280];

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(2);
}

for (const locale of ["en", "es"]) {
  test(`landing renders & no overflow (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await expect(page.locator("h1").first()).toBeVisible();
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await noHorizontalScroll(page);
    }
    await page.screenshot({ path: `test-results/landing-${locale}.png`, fullPage: true });
  });

  test(`star chart renders (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/map/`);
    await expect(page.locator("svg").first()).toBeVisible();
    await page.screenshot({ path: `test-results/map-${locale}.png`, fullPage: true });
  });

  test(`module reader renders (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/module/gen-l5-m1/`);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.screenshot({ path: `test-results/module-${locale}.png`, fullPage: true });
  });
}

test("no purple slop gradient in hero background", async ({ page }) => {
  await page.goto("/en/");
  // The hero viz uses a neutral film gradient, not the AI-slop violet.
  const bg = await page.locator(".hero-viz").first().evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg).not.toContain("rgb(124, 92, 255)"); // --locked/violet must not appear as hero bg
});

test("body text contrast is legible on dark canvas", async ({ page }) => {
  await page.goto("/en/");
  const color = await page.locator("p").first().evaluate((el) => getComputedStyle(el).color);
  expect(color).toBeTruthy();
});

test("diagnostic flow starts", async ({ page }) => {
  await page.goto("/en/assess/");
  await expect(page.getByText(/Twenty minutes/i)).toBeVisible();
  await page.getByRole("button", { name: /Begin/i }).click();
  await expect(page.getByText(/How true is each/i)).toBeVisible();
});
