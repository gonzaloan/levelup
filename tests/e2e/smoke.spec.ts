import { expect, test } from "@playwright/test";

test("home lists every topic and search opens a concept", async ({ page }) => {
  await page.goto("/es/");
  await expect(page.locator(".domain-card")).toHaveCount(12);
  await page.locator(".search-hero").click();
  await page.keyboard.type("hnsw");
  await expect(page.locator(".palette-results li").first()).toContainText(/HNSW/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/es\/c\/ann-indexes\/$/);
  await expect(page.locator("h1")).toContainText("HNSW");
});

test("concept page has every section and a rendered diagram", async ({ page }) => {
  await page.goto("/en/c/reranking/");
  for (const id of ["tldr", "how", "diagram", "code", "example", "tradeoffs", "pitfalls", "interview", "related"]) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  // Exactly one variant of the diagram is visible: the one matching the active theme.
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  await expect(page.locator(`.dg-${theme} svg`)).toBeVisible();
  await expect(page.locator(`.dg-${theme === "dark" ? "light" : "dark"} svg`)).toBeHidden();
  await page.locator(".qa summary").first().click();
  await expect(page.locator(".qa-a").first()).toBeVisible();
});

test("theme toggle switches the diagram variant", async ({ page }) => {
  await page.goto("/en/c/reranking/");
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.locator('button[aria-label="Toggle theme"]').click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
  await expect(page.locator(after === "light" ? ".dg-light svg" : ".dg-dark svg")).toBeVisible();
});

test("language switch keeps the page", async ({ page }) => {
  await page.goto("/es/c/reranking/");
  await page.locator("a.lang").click();
  await expect(page).toHaveURL(/\/en\/c\/reranking\/$/);
});

test("mastered toggle persists across reloads", async ({ page }) => {
  await page.goto("/en/c/reranking/");
  const btn = page.locator(".mastered-btn");
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(".mastered-btn")).toHaveAttribute("aria-pressed", "true");
});

test("cheatsheet filter narrows rows", async ({ page }) => {
  await page.goto("/en/cheatsheet/");
  const all = await page.locator(".sheet-row:visible").count();
  await page.locator(".filter-input input").fill("rerank");
  await expect.poll(() => page.locator(".sheet-row:visible").count()).toBeLessThan(all);
  await expect(page.locator(".sheet-row:visible").first()).toContainText(/rerank/i);
});

test("practice reveals and grades a card", async ({ page }) => {
  await page.goto("/en/practice/");
  await expect(page.locator(".flash-q")).toBeVisible();
  await page.keyboard.press(" ");
  await expect(page.locator(".flash-a")).toBeVisible();
  await page.locator(".btn-good").click();
  await expect(page.locator(".flash-stats")).toContainText("1 reviewed");
});
