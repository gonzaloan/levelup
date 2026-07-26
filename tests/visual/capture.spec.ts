import { test } from "@playwright/test";

// Captures a full screenshot set for the final product review, including the
// diagnostic flow driven to a results screen (so reviewers see the radar + gap).
//
// This is a capture job, not an assertion: it answers up to 80 diagnostic items
// and takes eight full-page screenshots, which does not fit the 30s default. It
// used to fail on that timeout alone (mid-screenshot, after "fonts loaded"), which
// read like a product defect and was only ever a budget. The work is genuinely
// slow, so give it a real one rather than trimming the coverage.
test("capture full journey (en)", async ({ page }) => {
  test.slow(); // 3× the default timeout
  await page.goto("/en/");
  await page.screenshot({ path: "test-results/review-01-landing.png", fullPage: true });

  await page.goto("/en/assess/");
  await page.getByRole("button", { name: /Begin/i }).click();
  await page.screenshot({ path: "test-results/review-02-self.png", fullPage: true });
  // answer self-ratings (pick "Usually" for each axis — six axes incl. AI Eng)
  const selfCards = page.locator(".card");
  const axisCount = await selfCards.count();
  for (let i = 0; i < axisCount; i++) {
    await selfCards.nth(i).getByRole("button", { name: /Usually/i }).click().catch(() => {});
  }
  await page.getByRole("button", { name: /Next/i }).click();
  await page.screenshot({ path: "test-results/review-03-item.png", fullPage: true });

  // Answer all items. Options live inside the question card (the first .card);
  // confidence is a separate card. Pick option → confidence → Next, until results.
  for (let n = 0; n < 80; n++) {
    if (page.url().includes("/results")) break;
    const questionCard = page.locator(".card").first();
    const option = questionCard.locator("button").first();
    if (await option.count()) await option.click().catch(() => {});
    const conf = page.getByRole("button", { name: /^Fairly sure$/i });
    if (await conf.count()) await conf.first().click().catch(() => {});
    const next = page.getByRole("button", { name: /^Next$/i });
    if (await next.count()) await next.first().click().catch(() => {});
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/review-04-results.png", fullPage: true });

  await page.goto("/en/map/");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/review-05-map.png", fullPage: true });

  await page.goto("/en/module/gen-l5-m1/");
  await page.screenshot({ path: "test-results/review-06-module.png", fullPage: true });
  // The Room
  await page.getByRole("button", { name: /The Room/i }).click().catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/review-07-room.png", fullPage: true });

  await page.goto("/en/module/gen-l5-m5/");
  await page.getByRole("button", { name: /Field Work/i }).click().catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/review-08-fieldwork.png", fullPage: true });

  await page.goto("/en/tracks/");
  await page.screenshot({ path: "test-results/review-09-tracks.png", fullPage: true });
  await page.goto("/en/method/");
  await page.screenshot({ path: "test-results/review-10-method.png", fullPage: true });
});

test("capture landing + module (es)", async ({ page }) => {
  await page.goto("/es/");
  await page.screenshot({ path: "test-results/review-11-landing-es.png", fullPage: true });
  await page.goto("/es/module/gen-l5-m1/");
  await page.screenshot({ path: "test-results/review-12-module-es.png", fullPage: true });
});
