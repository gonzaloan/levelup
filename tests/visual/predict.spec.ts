import { test, expect } from "@playwright/test";

// The Predict stage: commit a guess before the concept explains itself.
//
// The pedagogy audit found this stage missing platform-wide — `grep -rn predict`
// over src/ returned two unrelated hits. The pane named the judgment, showed the
// figure, then explained, so a learner was handed the answer before ever
// committing to one. These tests assert the three properties that make it a
// prediction rather than a quiz:
//   1. it appears BEFORE the figure, and the figure is withheld until it resolves
//   2. committing shows the mechanism, and a wrong guess is not a dead end
//   3. it is skippable, because a reference lookup should not be made to re-guess

const LESSON = "ai-engineering-l4";
/** Pane index of a concept carrying `predict` (0-based; nav button 0 is the overview). */
const RAG_PANE = 1;

async function openPane(page: import("@playwright/test").Page, index: number) {
  await page.goto(`/en/lesson/${LESSON}/`);
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /^Begin/ }).click();
  await page.waitForTimeout(350);
  await page.locator("nav.concept-nav button").nth(index + 1).click();
  await page.waitForTimeout(450);
}

test("the prediction gates the figure it would otherwise give away", async ({ page }) => {
  await openPane(page, RAG_PANE);

  const predict = page.locator(".cp-predict");
  await expect(predict, "no .cp-predict on a concept that authored one").toBeVisible();

  // The definition must be ABOVE it — you cannot predict about a thing whose name
  // you have not been given. `cp-def` is a class on the prose paragraphs, so there
  // are several; assert the first.
  await expect(page.locator(".cp-def").first()).toBeVisible();

  // The context rail must not leak the answer beside the question: its Takeaways
  // tab lists the concept key points, which for this concept ARE the answer.
  await expect(page.locator(".context-rail-withheld")).toBeVisible();
  await expect(page.locator(".rail-tabs")).toHaveCount(0);

  // …and the figure and the labelled sections must NOT be on screen yet.
  await expect(page.locator(".cp-figure")).toHaveCount(0);

  const options = predict.locator(".cp-predict-option");
  expect(await options.count(), "a prediction needs at least two options").toBeGreaterThanOrEqual(2);

  await page.screenshot({ path: "test-results/predict-before.png", fullPage: true });
});

test("committing reveals the mechanism and then the figure", async ({ page }) => {
  await openPane(page, RAG_PANE);
  const predict = page.locator(".cp-predict");
  await predict.locator(".cp-predict-option").first().click();
  await page.waitForTimeout(350);

  // Exactly one option is marked — the learner's own — and it is announced.
  const marked = await predict.locator(".cp-predict-option[data-state]").count();
  expect(marked, "only the learner's own pick should be marked").toBe(1);
  await expect(predict.locator('[role="status"]')).toBeVisible();

  // The resolution carries the mechanism, not just a verdict.
  const mechanism = await predict.locator(".cp-predict-mechanism").innerText();
  expect(mechanism.length, "the resolution should explain the mechanism").toBeGreaterThan(60);

  // Continuing releases the figure that was held back.
  await predict.getByRole("button", { name: /Now show me why/i }).click();
  await page.waitForTimeout(400);
  await expect(page.locator(".cp-figure").first()).toBeVisible();
  await expect(page.locator(".cp-predict")).toHaveCount(0);

  await page.screenshot({ path: "test-results/predict-after.png", fullPage: true });
});

test("a wrong prediction still teaches, and is not a dead end", async ({ page }) => {
  await openPane(page, RAG_PANE);
  const predict = page.locator(".cp-predict");
  const options = predict.locator(".cp-predict-option");

  // Click every option until one lands on the wrong answer, so this does not
  // depend on the shuffled position.
  const n = await options.count();
  let foundWrong = false;
  for (let i = 0; i < n; i++) {
    await openPane(page, RAG_PANE);
    const opts = page.locator(".cp-predict .cp-predict-option");
    await opts.nth(i).click();
    await page.waitForTimeout(300);
    if (await page.locator('.cp-predict-option[data-state="bad"]').count()) { foundWrong = true; break; }
  }
  expect(foundWrong, "every option was marked correct — there are no distractors").toBe(true);

  // A wrong guess gets its OWN explanation plus the mechanism, and can continue.
  const body = await page.locator(".cp-predict-resolution").innerText();
  expect(body.length, "a wrong prediction should get a real explanation").toBeGreaterThan(120);
  await expect(page.getByRole("button", { name: /Now show me why/i })).toBeVisible();
});

test("the prediction is skippable", async ({ page }) => {
  // A learner opening a concept for reference should not be forced to re-guess.
  await openPane(page, RAG_PANE);
  await page.getByRole("button", { name: /Skip the prediction/i }).click();
  await page.waitForTimeout(400);
  await expect(page.locator(".cp-predict")).toHaveCount(0);
  await expect(page.locator(".cp-figure").first()).toBeVisible();
});

test("it renders in the pixel theme and in Spanish", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("levelup.theme", "pixel"));
  await page.goto(`/es/lesson/${LESSON}/`);
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /Comenzar|Empezar/i }).first().click();
  await page.waitForTimeout(350);
  await page.locator("nav.concept-nav button").nth(RAG_PANE + 1).click();
  await page.waitForTimeout(450);

  const predict = page.locator(".cp-predict");
  await expect(predict).toBeVisible();
  // Spanish, authored: the label and the skip affordance must be localized.
  await expect(predict.getByText(/Predice primero/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Saltar la predicción/i })).toBeVisible();
  await page.screenshot({ path: "test-results/predict-pixel-es.png", fullPage: true });
});
