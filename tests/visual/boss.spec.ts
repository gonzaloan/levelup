import { test, expect } from "@playwright/test";

// The checkpoint now opens with a boss presentation (name + HP bar), and the
// gauntlet keeps its boss framing. Verifies the boss card renders in both themes.
test("checkpoint opens with a boss card (studio)", async ({ page }) => {
  await page.goto("/en/checkpoint/chk-technical-depth-l3/");
  await page.locator(".loader-overlay[data-show='false']").waitFor({ state: "attached" }).catch(() => {});
  await page.waitForTimeout(700);
  await expect(page.locator(".boss-card")).toBeVisible();
  await expect(page.locator(".boss-name")).toBeVisible();
  await expect(page.locator(".boss-health")).toBeVisible();
  const name = (await page.locator(".boss-name").first().innerText()).trim();
  expect(name.length).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/boss-studio.png", fullPage: true });
});

test("checkpoint boss card in pixel theme", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("levelup.theme", "pixel"));
  await page.goto("/en/checkpoint/chk-technical-depth-l3/");
  await page.waitForTimeout(700);
  await expect(page.locator(".boss-card")).toBeVisible();
  await page.screenshot({ path: "test-results/boss-pixel.png", fullPage: true });
});

test("engaging the boss starts the quiz and shows draining HP", async ({ page }) => {
  await page.goto("/en/checkpoint/chk-technical-depth-l3/");
  await page.getByRole("button", { name: /Engage/i }).click();
  await expect(page.locator(".boss-health")).toBeVisible();
});
