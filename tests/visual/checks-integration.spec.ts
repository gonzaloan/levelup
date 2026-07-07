import { test, expect, type Page } from "@playwright/test";

// Proves checks are live in the real flow: a formative check renders in a
// lesson's practice stage, and the checkpoint boss battle counts checks into
// its step total (8 MCQ + 2 checks = 10 steps for technical-depth-l5).

async function settle(page: Page) { await page.waitForTimeout(700); }

test("formative check renders in the lesson practice stage", async ({ page }) => {
  await page.goto("/en/lesson/technical-depth-l5/");
  await settle(page);
  // Walk the lesson to the practice stage. Each turn: if a check is showing, stop.
  // Otherwise advance via the single primary CTA; in the mid-quiz, pick an option
  // first (options are .card .btn), then the primary CTA appears.
  for (let i = 0; i < 60 && (await page.locator(".check").count()) === 0; i++) {
    const cta = page.getByRole("button", { name: /^(Start|Got it.*|Take the.*|Continue|Next|Begin.*)/i }).first();
    if (await cta.count()) { await cta.click({ timeout: 2000 }).catch(() => {}); }
    else {
      const opt = page.locator(".card").last().locator("button").first();
      if (await opt.count()) await opt.click({ timeout: 2000 }).catch(() => {});
    }
    await page.waitForTimeout(120);
  }
  await expect(page.locator(".check").first()).toBeVisible();
  await page.screenshot({ path: "test-results/check-lesson.png", fullPage: true });
});

test("checkpoint boss battle folds graded checks into its step total", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("levelup.theme", "pixel"));
  await page.goto("/en/checkpoint/chk-technical-depth-l5/");
  await settle(page);
  await page.getByRole("button", { name: /Engage/i }).click();
  // The step counter reads "· 1/N"; N must exceed the MCQ count because checks
  // were appended (technical-depth-l5 covers 8 concepts w/ checks → N = 10).
  const counter = page.locator(".eyebrow", { hasText: /\d+\/\d+/ }).first();
  await expect(counter).toBeVisible();
  const txt = await counter.innerText();
  const total = Number(txt.match(/\/(\d+)/)?.[1] ?? "0");
  expect(total).toBeGreaterThan(8);   // MCQ-only would be ≤ 8
  await expect(page.locator(".boss-health")).toBeVisible();
  await page.screenshot({ path: "test-results/check-checkpoint.png", fullPage: true });
});
