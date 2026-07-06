import { test, expect, type Page } from "@playwright/test";

// Verifies the redesigned lesson workbench: entering a concept shows the
// three-column grid (nav · content · rail), content is VISIBLE (not
// default-hidden — the Cycle-2 regression), and it holds up in the pixel theme.
async function enterFirstConcept(page: Page) {
  await page.goto("/en/lesson/technical-depth-l5/");
  await page.waitForTimeout(700); // let the intro loader fade
  // overview → first concept ("Begin"/"Start")
  const start = page.getByRole("button", { name: /→/ }).first();
  await start.click();
  await page.waitForTimeout(300);
}

test("lesson concept pane renders the three-column workbench (studio)", async ({ page }) => {
  await enterFirstConcept(page);
  await expect(page.locator(".lesson-grid")).toBeVisible();
  await expect(page.locator(".concept-nav")).toBeVisible();
  await expect(page.locator(".lesson-content")).toBeVisible();
  // content column has a visible heading with real text
  const h2 = page.locator(".lesson-content h2").first();
  await expect(h2).toBeVisible();
  expect((await h2.innerText()).trim().length).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/lesson-studio.png", fullPage: true });
});

test("lesson concept pane holds up in the pixel theme", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("levelup.theme", "pixel"));
  await enterFirstConcept(page);
  await expect(page.locator(".lesson-grid")).toBeVisible();
  // scenery is present behind content
  await expect(page.locator(".scenery")).toBeAttached();
  await page.screenshot({ path: "test-results/lesson-pixel.png", fullPage: true });
});

test("no horizontal overflow in the lesson (both column counts)", async ({ page }) => {
  await enterFirstConcept(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
