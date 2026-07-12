import { test, expect } from "@playwright/test";

// Visual + interaction smoke for the new Climb progression view and Build Lab.
test("climb view renders the ladder with a you-are-here header", async ({ page }) => {
  await page.goto("/en/learn/");
  // The Climb is the default tab.
  await expect(page.getByRole("tab", { name: "The Climb" })).toBeVisible();
  await expect(page.getByText("You are here")).toBeVisible();
  // L3 stage is in progress; a higher stage is locked.
  await expect(page.locator('.stage[data-status="current"]').first()).toBeVisible();
  await expect(page.locator('.stage[data-status="locked"]').first()).toBeVisible();
  await page.screenshot({ path: "tests/visual/__shots__/climb-en.png", fullPage: true });
});

test("browse-by-domain toggle still works", async ({ page }) => {
  await page.goto("/en/learn/");
  await page.getByRole("tab", { name: "Browse by domain" }).click();
  await expect(page.locator(".ws-sidebar").first()).toBeVisible();
});

test("build lab: place components, connect, grade", async ({ page }) => {
  await page.goto("/en/build/");
  await expect(page.getByRole("heading", { name: /Build it/i })).toBeVisible();
  // Select a palette chip, then place it into the first empty slot.
  const canvas = page.locator(".arch-canvas").first();
  await expect(canvas).toBeVisible();
  const chip = page.locator(".arch-chip").first();
  await chip.click();
  await page.locator('.arch-slot[data-filled="false"]').first().click();
  // A node should now be placed.
  await expect(page.locator('.arch-slot[data-filled="true"]')).toHaveCount(1);
  await page.screenshot({ path: "tests/visual/__shots__/build-en.png", fullPage: true });
});
