import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// Is the mastery gate memorisable?
//
// It was. A wrong answer painted the CORRECT option green, so one failed attempt
// handed over the whole answer key; `retry()` then replayed the same items in a
// provably identical order, because `itemKey` was a pure function of stable
// inputs. Two passes cleared any of the 35 checkpoints.
//
// These tests drive the real gate: answer wrong on purpose, and require that the
// UI does not point at the right answer.

interface Opt { text: { en: string }; correct: boolean }
interface Item { stem: { en: string }; options: Opt[] }
const CURRICULUM = JSON.parse(readFileSync("src/content/data/curriculum.json", "utf8")) as {
  checkpoints: { id: string; items: Item[] }[];
};
const CP = CURRICULUM.checkpoints.find((c) => c.items.length >= 4)!;

/**
 * Identify which item is on screen by its OPTION texts, not its stem.
 * Matching the stem needs a locator that happens to pick the right paragraph;
 * the option set is unique per item and is already in the DOM we are asserting on.
 */
async function currentItem(page: import("@playwright/test").Page) {
  const texts = (await page.locator(".stack .btn").allInnerTexts()).map((t) => t.trim());
  const item = CP.items.find((it) =>
    it.options.every((o) => texts.some((t) => t.includes(o.text.en.trim().slice(0, 28)))));
  return { item, texts };
}

const indexOf = (texts: string[], opt: Opt) =>
  texts.findIndex((t) => t.includes(opt.text.en.trim().slice(0, 28)));

/** Every option that carries a ✓ or ✗ after the reveal. */
const marks = (page: import("@playwright/test").Page) =>
  page.locator(".stack .btn").evaluateAll((els) =>
    els.map((el) => (el.textContent || "").trim()).filter((t) => t.startsWith("✓") || t.startsWith("✗")));

async function openGate(page: import("@playwright/test").Page) {
  await page.goto(`/en/checkpoint/${CP.id}/`);
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Engage/i }).click();
  await page.waitForTimeout(400);
}

test("a wrong answer does not reveal which option was right", async ({ page }) => {
  await openGate(page);
  const { item, texts } = await currentItem(page);
  expect(item, "could not identify the rendered checkpoint item").toBeTruthy();
  if (!item) return;

  const wrong = item.options.find((o) => !o.correct)!;
  const i = indexOf(texts, wrong);
  expect(i, "the wrong option is not on screen").toBeGreaterThanOrEqual(0);

  await page.locator(".stack .btn").nth(i).click();
  await page.waitForTimeout(500);

  const m = await marks(page);
  expect(m.length, `${m.length} options marked after a wrong answer: ${m.map((s) => s.slice(0, 20))}`).toBe(1);
  expect(m[0].startsWith("✗"), "the single mark must be the ✗ on the learner's own pick").toBe(true);
  expect(m.some((t) => t.startsWith("✓")), "a ✓ after a WRONG answer hands over the key").toBe(false);

  // The rationale for the learner's own choice still shows — that is the teaching.
  // Scoped: the boss health bar is also a live region, so a bare [role=status]
  // matches two elements.
  await expect(page.locator('[role="status"]').filter({ hasText: /Not quite|Correct/ })).toBeVisible();
  await page.screenshot({ path: "test-results/checkpoint-wrong-answer.png", fullPage: true });
});

test("a correct answer still gets full confirmation", async ({ page }) => {
  // The other half of the contract: withholding the key on a miss must not also
  // withhold confirmation on a hit.
  await openGate(page);
  const { item, texts } = await currentItem(page);
  expect(item).toBeTruthy();
  if (!item) return;

  const right = item.options.find((o) => o.correct)!;
  const i = indexOf(texts, right);
  expect(i).toBeGreaterThanOrEqual(0);

  await page.locator(".stack .btn").nth(i).click();
  await page.waitForTimeout(500);

  const m = await marks(page);
  expect(m.length).toBe(1);
  expect(m[0].startsWith("✓"), "a correct answer must be confirmed with ✓").toBe(true);
  await expect(page.locator('[role="status"]').filter({ hasText: /Correct/ })).toBeVisible();
  await page.screenshot({ path: "test-results/checkpoint-right-answer.png", fullPage: true });
});
