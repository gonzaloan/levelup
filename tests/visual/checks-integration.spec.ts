import { test, expect, type Page } from "@playwright/test";

// Proves checks are live in the real flow: a formative check renders in a
// lesson's practice stage, and the checkpoint boss battle counts checks into
// its step total (8 MCQ + 2 checks = 10 steps for technical-depth-l5).

async function settle(page: Page) { await page.waitForTimeout(700); }

test("formative check renders in the lesson practice stage", async ({ page }) => {
  await page.goto("/en/lesson/technical-depth-l5/");
  await settle(page);

  // Walk the real stages explicitly rather than clicking whatever button happens
  // to be first. The old generic walk looped forever inside the 24-card recall
  // deck: its CTA is "Flip", which the regex didn't match, so it kept re-clicking
  // the same card and never reached the practice stage.
  //   overview → concept panes → recall (optional) → mid-quiz → practice
  await page.getByRole("button", { name: /^Begin/ }).click();
  await settle(page);

  // Concept panes: the last one's CTA is "Start the check", not "Got it — continue".
  for (let i = 0; i < 12; i++) {
    const next = page.getByRole("button", { name: /Got it — continue|Start the check/ });
    if (!(await next.count())) break;
    await next.first().click();
    await page.waitForTimeout(200);
  }

  // Recall is optional practice; skip past it to reach the graded flow.
  const skipRecall = page.getByRole("button", { name: /Skip recall/i });
  if (await skipRecall.count()) {
    await skipRecall.first().click();
    await settle(page);
  }

  // Mid-quiz: pick an option, then advance. 3 items, plus a guard iteration.
  for (let q = 0; q < 5 && (await page.locator(".check").count()) === 0; q++) {
    const options = page.locator(".card .btn");
    if (!(await options.count())) break;
    await options.nth(0).click().catch(() => {});
    await page.waitForTimeout(250);
    const next = page.getByRole("button", { name: /^(Next|Continue)/i }).first();
    if (await next.count()) { await next.click(); await page.waitForTimeout(300); }
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
