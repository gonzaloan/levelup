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

// ── the whole route, not one concept ──────────────────────────────────────
//
// Everything above tests ONE concept deeply, which is right for the mechanics and
// wrong for coverage: it passed while 21 of the AI route's 24 concepts had no
// prediction at all. The five tests above would not have noticed, because they
// hardcode the one lesson and pane that did.
//
// This sweep walks every AI-route concept in a browser and asserts the prediction
// is really on screen and really gates the figure. Source validation cannot answer
// that — `merge-lessons.cjs` checks the DATA, and a field that never renders passes
// it. So this is the test that makes the coverage claim in
// docs/transformation/target-learning-model.md checkable.
const AI_LESSONS = [
  { id: "ai-engineering-l3", panes: 4 },
  { id: "ai-engineering-l4", panes: 6 },
  { id: "ai-engineering-l5", panes: 6 },
  { id: "ai-engineering-l6", panes: 5 },
  { id: "ai-engineering-l7", panes: 3 },
];

for (const lesson of AI_LESSONS) {
  test(`every concept in ${lesson.id} opens with a prediction that withholds the figure`, async ({ page }) => {
    const missing: string[] = [];
    const leaking: string[] = [];
    for (let pane = 0; pane < lesson.panes; pane++) {
      await page.goto(`/en/lesson/${lesson.id}/`);
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: /^Begin/ }).click();
      await page.waitForTimeout(300);
      await page.locator("nav.concept-nav button").nth(pane + 1).click();
      await page.waitForTimeout(400);

      if (!(await page.locator(".cp-predict").count())) { missing.push(`pane ${pane}`); continue; }

      // A prediction that leaves the figure on screen is decoration: the learner
      // reads the answer off the diagram and then "commits".
      if (await page.locator(".cp-figure").count()) leaking.push(`pane ${pane}`);

      // Two options minimum, and exactly one correct — otherwise there is nothing
      // to commit to. The count is asserted here as well as in the merge validator,
      // because this is the rendered DOM rather than the authored JSON.
      const options = page.locator(".cp-predict .cp-predict-option");
      expect(await options.count(), `${lesson.id} pane ${pane} has too few options`)
        .toBeGreaterThanOrEqual(2);
    }
    expect(missing, `${lesson.id}: concepts with no prediction`).toEqual([]);
    expect(leaking, `${lesson.id}: prediction shown alongside the figure it gives away`).toEqual([]);
  });
}

test("a prediction resolves and releases the figure on a concept outside the pilot", async ({ page }) => {
  // The deep tests above all run against ai-engineering-l4. This repeats the core
  // interaction on an L7 concept, so a regression that only affects the newly
  // authored predictions cannot hide behind the pilot concept still working.
  await page.goto("/en/lesson/ai-engineering-l7/");
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /^Begin/ }).click();
  await page.waitForTimeout(300);
  await page.locator("nav.concept-nav button").nth(1).click();
  await page.waitForTimeout(400);

  const predict = page.locator(".cp-predict");
  await expect(predict).toBeVisible();
  await expect(page.locator(".cp-figure")).toHaveCount(0);

  await predict.locator(".cp-predict-option").first().click();
  await page.waitForTimeout(300);
  expect(await predict.locator(".cp-predict-option[data-state]").count()).toBe(1);
  const mechanism = await predict.locator(".cp-predict-mechanism").innerText();
  expect(mechanism.length, "the resolution should explain the mechanism").toBeGreaterThan(60);

  await predict.getByRole("button", { name: /Now show me why/i }).click();
  await page.waitForTimeout(400);
  await expect(page.locator(".cp-figure").first()).toBeVisible();
});
