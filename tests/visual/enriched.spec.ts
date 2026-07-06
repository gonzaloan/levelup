import { test, expect } from "@playwright/test";

// Proof that enriched content renders: systems-architecture-l5 concept 1 has
// keywords/code/example/architecture in the rail; a later concept has an
// interactive widget. Capture both themes.
test("enriched concept shows a full context rail (studio)", async ({ page }) => {
  await page.goto("/en/lesson/systems-architecture-l5/");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /→/ }).first().click();
  await page.waitForTimeout(300);
  // rail has more than just Takeaways now
  const tabs = page.locator(".rail-tab");
  expect(await tabs.count()).toBeGreaterThan(2);
  await page.screenshot({ path: "test-results/enriched-studio.png", fullPage: true });
});

test("enriched concept with an interactive widget (pixel)", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("levelup.theme", "pixel"));
  await page.goto("/en/lesson/systems-architecture-l5/");
  await page.waitForTimeout(700);
  // advance to the monolith concept (has scaling-curves widget) — it's concept 1
  await page.getByRole("button", { name: /→/ }).first().click();
  await page.waitForTimeout(400);
  await expect(page.locator(".viz").first()).toBeVisible();
  await page.screenshot({ path: "test-results/enriched-pixel.png", fullPage: true });
});
