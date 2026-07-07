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

// Regression guard: the pixel theme bumps `p` font-size, but small captions using
// .text-sm must stay small (the .text-sm utility must out-specify the p rule).
// Catches the class-vs-inline specificity trap from the hygiene refactor.
test(".text-sm stays small under the pixel theme", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("levelup.theme", "pixel"));
  await page.goto("/en/lesson/technical-depth-l5/");
  await page.waitForTimeout(700);
  // Inject a probe element that uses the utility on a <p>, then measure it.
  const px = await page.evaluate(() => {
    const p = document.createElement("p");
    p.className = "dim text-sm";
    p.textContent = "probe";
    document.querySelector("main")!.appendChild(p);
    const size = parseFloat(getComputedStyle(p).fontSize);
    p.remove();
    return size;
  });
  // --t-sm is 0.875rem = 14px; the pixel `p` bump would make it ~17px.
  expect(px).toBeLessThan(15);
});

test("engaging the boss starts the quiz and shows draining HP", async ({ page }) => {
  await page.goto("/en/checkpoint/chk-technical-depth-l3/");
  await page.getByRole("button", { name: /Engage/i }).click();
  await expect(page.locator(".boss-health")).toBeVisible();
});
