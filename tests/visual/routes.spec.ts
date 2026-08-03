import { test, expect } from "@playwright/test";

// The route surface, in a browser.
//
// `tests/routes.test.ts` proves the MODEL keeps the two progressions independent.
// This proves the surface exists, that picking one does not silently pick the other,
// and that a learner can see the bar for a stage they have not reached — a locked
// rung whose requirement is hidden is a wall, not a target.

async function openRoutes(page: import("@playwright/test").Page, locale = "en") {
  await page.goto(`/${locale}/learn/`);
  await page.waitForTimeout(600);
  // Routes is the default mode when the flag is on; click the tab anyway so this
  // still passes if the default changes.
  const tab = page.getByRole("tab", { name: /^(Routes|Rutas)$/ });
  if (await tab.count()) { await tab.click(); await page.waitForTimeout(300); }
}

test("the picker offers two peers and does not choose for you", async ({ page }) => {
  await openRoutes(page);
  const cards = page.locator(".route-card");
  await expect(cards).toHaveCount(2);
  await expect(page.locator('.route-card[data-route="ai-architect"]')).toBeVisible();
  await expect(page.locator('.route-card[data-route="staff-engineer"]')).toBeVisible();
  // Unchosen is a real state: no stage list until a choice is made.
  await expect(page.locator(".route-stages")).toHaveCount(0);
  await page.screenshot({ path: "test-results/routes-picker.png", fullPage: true });
});

test("Shared Foundations is present but is not a third choice", async ({ page }) => {
  await openRoutes(page);
  // It appears — a learner must know it exists — as a band, not a pickable card.
  const shared = page.locator(".route-shared");
  await expect(shared).toBeVisible();
  await expect(shared.locator(".route-card")).toHaveCount(0);
  // And it states it has no gate.
  await expect(shared).toContainText(/No gate|Sin barrera/);
});

test("picking a route shows its stages, with the locked bars still readable", async ({ page }) => {
  await openRoutes(page);
  await page.locator('.route-card[data-route="ai-architect"]').click();
  await page.waitForTimeout(400);

  const stages = page.locator(".route-stage");
  await expect(stages).toHaveCount(5);           // A1..A5
  await expect(page.locator(".route-stage-id").first()).toHaveText("A1");
  await expect(page.locator('.route-stage[data-status="current"]')).toHaveCount(1);

  // Every stage states its bar, INCLUDING the locked ones.
  const bars = await page.locator(".route-stage-defines").allInnerTexts();
  expect(bars).toHaveLength(5);
  for (const b of bars) expect(b.trim().length, "a stage does not state its bar").toBeGreaterThan(40);

  await page.screenshot({ path: "test-results/routes-ai.png", fullPage: true });
});

test("switching routes says the progress is kept, and keeps it", async ({ page }) => {
  await openRoutes(page);
  await page.locator('.route-card[data-route="staff-engineer"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator(".route-stage-id").first()).toHaveText("S1");

  const swap = page.locator(".route-switch");
  await expect(swap).toBeVisible();
  // The copy has to say it, because a learner who fears losing progress will not
  // explore — and there is nothing to lose.
  await expect(swap).toContainText(/progress here is kept|progreso aquí se conserva/);
  await swap.click();
  await page.waitForTimeout(400);
  await expect(page.locator(".route-stage-id").first()).toHaveText("A1");
});

test("the Climb is still reachable — nothing was taken away", async ({ page }) => {
  await openRoutes(page);
  const climb = page.getByRole("tab", { name: /The Climb|La Subida/ });
  await expect(climb).toBeVisible();
  await climb.click();
  await page.waitForTimeout(500);
  await expect(page.locator(".route-stages")).toHaveCount(0);
});

test("it renders in Spanish and in the pixel theme", async ({ page }) => {
  await openRoutes(page, "es");
  await expect(page.locator(".route-card")).toHaveCount(2);
  await expect(page.getByText(/Arquitecto de IA/)).toBeVisible();
  await expect(page.getByText(/Ingeniero Staff/).first()).toBeVisible();
  await page.screenshot({ path: "test-results/routes-es.png", fullPage: true });
});

test("a concept surfaces the foundations it leans on, without gating them", async ({ page }) => {
  // The mechanism that makes Shared Foundations a LAYER: one canonical definition,
  // pointed at from the module that needs it. `rag-as-system` reasons about
  // saturation, so it leans on backpressure — advisory, never a prerequisite, because
  // gating it would force every AI learner through the systems domain.
  await page.goto("/en/lesson/ai-engineering-l5/");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /^Begin/ }).click();
  await page.waitForTimeout(300);

  let found = false;
  for (let i = 0; i < 8; i++) {
    const skip = page.getByRole("button", { name: /Skip the prediction/i });
    if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(180); }
    if (await page.locator(".cp-foundations").count()) { found = true; break; }
    const next = page.locator(".cp-next");
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(200);
  }
  expect(found, "no concept in this lesson surfaces a shared foundation").toBe(true);

  const row = page.locator(".cp-foundations").first();
  await expect(row).toContainText(/Leans on/);
  const links = row.locator(".cp-foundation-link");
  expect(await links.count()).toBeGreaterThan(0);
  // It goes to the foundation's own lesson — the canonical definition, not a copy.
  await expect(links.first()).toHaveAttribute("href", /\/lesson\/(technical-depth|systems-architecture|cloud-platform)-l\d/);
  await page.screenshot({ path: "test-results/routes-foundations.png", fullPage: true });
});
