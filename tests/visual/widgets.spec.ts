import { test, expect } from "@playwright/test";

// The new parameterized widgets live on concept panes (client-paginated). Enter
// the lesson, then step through concepts until the widget appears.
//
// The walk has to clear the Predict step. A concept that authors a prediction withholds
// its figure — and its widget — until the learner commits or skips, so the pane's
// primary button is the prediction's own control rather than "next". This walker used to
// click blindly and stall there: once every AI-route concept gained a prediction, the
// spectrum widget on pane 1 became unreachable *to the test* while remaining one skip
// away for a learner.
//
// Skipping is the right move here rather than committing. This suite is about whether a
// widget renders, and a real learner reaching a concept for reference has the same
// affordance.
async function findWidget(page: import("@playwright/test").Page, selector: string) {
  // Enter the learn flow from the overview (the Start button INSIDE the lesson
  // card, not the nav CTA). The overview card holds the primary button.
  await page.locator(".lesson-overview .btn-primary").click();
  await page.waitForTimeout(200);
  // Step through concept panes via the pane's primary "next" button.
  for (let i = 0; i < 8; i++) {
    // Clear a prediction gate if this pane has one, before looking for the widget.
    const skip = page.getByRole("button", { name: /Skip the prediction|Saltar la predicción/i });
    if (await skip.count()) { await skip.first().click().catch(() => {}); await page.waitForTimeout(300); }

    const w = page.locator(selector).first();
    if (await w.count() && await w.isVisible().catch(() => false)) return w;
    const next = page.locator(".lesson-content .btn-primary").first();
    if (await next.count()) { await next.click().catch(() => {}); await page.waitForTimeout(200); }
    else break;
  }
  return page.locator(selector).first();
}

test("decision-flow widget renders in a technical-depth lesson", async ({ page }) => {
  await page.goto("/en/lesson/technical-depth-l3/");
  const dflow = await findWidget(page, ".dflow");
  await expect(dflow).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: "tests/visual/__shots__/widget-dflow.png", fullPage: true });
});

test("spectrum widget renders in the AI L5 lesson", async ({ page }) => {
  await page.goto("/en/lesson/ai-engineering-l5/");
  const spec = await findWidget(page, ".spectrum");
  await expect(spec).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: "tests/visual/__shots__/widget-spectrum.png", fullPage: true });
});
