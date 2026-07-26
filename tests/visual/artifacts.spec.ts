import { test, expect, type Page } from "@playwright/test";

// Locks the anti-wall-of-text pass in place. Each of these was a real defect
// found by measurement during that work, so each assertion is a regression
// guard rather than a restatement of the implementation:
//   • the lesson overview buried its table of contents under 2-3 paragraphs
//   • `compare` diagrams rendered as two unpaired bullet lists
//   • a concept pane put 1,510px of prose before the first visual
//   • markdown artifacts showed raw `**` markers and broke sentences mid-clause
//   • an annotated line inside flowing prose split the paragraph in three

async function openLesson(page: Page, id: string, locale = "en") {
  await page.goto(`/${locale}/lesson/${id}/`);
  await page.waitForTimeout(700); // intro loader
}

async function enterConcept(page: Page, index: number) {
  await page.getByRole("button", { name: /→/ }).first().click();
  await page.waitForTimeout(250);
  for (let i = 0; i < index; i++) {
    await page.getByRole("button", { name: /→/ }).last().click();
    await page.waitForTimeout(250);
  }
}

test("lesson overview reaches its table of contents without a wall of prose", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLesson(page, "cloud-platform-l6");
  const toc = page.locator(".lesson-toc");
  await expect(toc).toBeVisible();
  // The contents list is the concrete thing on this screen; it must arrive
  // within roughly one phone screen of the card, not two.
  const y = await toc.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(y).toBeLessThan(700);
  // Nothing was deleted — the rest of the framing is one tap away.
  await expect(page.locator(".lesson-overview .cp-fold")).toHaveCount(1);
});

test("compare diagrams render as a paired two-sided table, not two bullet lists", async ({ page }) => {
  await openLesson(page, "cloud-platform-l5");
  await enterConcept(page, 0);
  // On a concept that also has code, the code takes the figure slot and the
  // schematic moves into a fold — deliberate, so open it before asserting.
  const fold = page.locator(".lesson-content .cp-fold").first();
  if (await fold.count()) await fold.locator("summary").first().click();
  const vs = page.locator(".schematic-vs").first();
  await expect(vs).toBeVisible();
  // Both side headers, and every row pairs a cell from each side.
  await expect(vs.locator(".schematic-vs-h--a")).toBeVisible();
  const rows = vs.locator(".schematic-vs-row");
  expect(await rows.count()).toBeGreaterThan(1);
  const first = rows.first();
  await expect(first.locator(".schematic-vs-cell--a")).toHaveCount(1);
  await expect(first.locator(".schematic-vs-cell--b")).toHaveCount(1);
});

test("a concept pane puts a visual near the top, not after a wall of text", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLesson(page, "cloud-platform-l5");
  await enterConcept(page, 0);
  const pxToFirstVisual = await page.evaluate(() => {
    const vis = document.querySelector(
      ".lesson-content .cp-figure, .lesson-content .schematic, .lesson-content .cv, .lesson-content .viz",
    );
    if (!vis) return Number.POSITIVE_INFINITY;
    return Math.round(vis.getBoundingClientRect().top + window.scrollY);
  });
  // Measured 1,510px before the pass; ~425px after. 900 leaves headroom for
  // content edits without letting a wall of prose back in.
  expect(pxToFirstVisual).toBeLessThan(900);
});

test("markdown artifacts read as documents: no raw markers, no mid-sentence breaks", async ({ page }) => {
  await openLesson(page, "direction-influence-l7");
  await enterConcept(page, 4);
  const cv = page.locator(".cv[data-prose]").first();
  await expect(cv).toBeVisible();
  const reveal = cv.locator(".cv-reveal");
  if ((await reveal.count()) && (await reveal.getAttribute("aria-expanded")) === "false") {
    await reveal.click();
  }
  // Emphasis is rendered, not shown as literal asterisks.
  await expect(cv.locator("strong").first()).toBeVisible();
  const body = await cv.locator(".cv-body").innerText();
  expect(body).not.toContain("**");
  // Headings read as headings, with the # markers removed.
  const heading = cv.locator(".cv-h1, .cv-h2").first();
  await expect(heading).toBeVisible();
  expect((await heading.innerText()).trim().startsWith("#")).toBe(false);
  // Hard-wrapped source lines are rejoined into flowing paragraphs.
  expect(await cv.locator(".cv-para").count()).toBeGreaterThan(0);
});

test("an annotated sentence inside prose stays inline", async ({ page }) => {
  await openLesson(page, "direction-influence-l7");
  await enterConcept(page, 4);
  const cv = page.locator(".cv[data-prose]").first();
  const reveal = cv.locator(".cv-reveal");
  if ((await reveal.count()) && (await reveal.getAttribute("aria-expanded")) === "false") {
    await reveal.click();
  }
  const anno = cv.locator(".cv-para .cv-inline-anno .cv-anno").first();
  await expect(anno).toHaveCount(1);
  // A <button> here is forced to inline-block by the UA and splits the
  // paragraph into three lines; the affordance must be a real inline element.
  await expect(anno).toHaveCSS("display", "inline");
  // And it still behaves as a button for keyboard and screen readers.
  await expect(anno).toHaveAttribute("role", "button");
  await anno.focus();
  await expect(cv.locator(".cv-tip.is-open")).toBeVisible();
});

test("diff artifacts mark both sides with more than colour", async ({ page }) => {
  await openLesson(page, "direction-influence-l4");
  await enterConcept(page, 1);
  const cv = page.locator('.cv[data-lang="diff"]').first();
  await expect(cv).toBeVisible();
  const reveal = cv.locator(".cv-reveal");
  if ((await reveal.count()) && (await reveal.getAttribute("aria-expanded")) === "false") {
    await reveal.click();
  }
  expect(await cv.locator(".cv-d-add").count()).toBeGreaterThan(0);
  expect(await cv.locator(".cv-d-del").count()).toBeGreaterThan(0);
  // Colour is a second channel: the +/- character has to survive in the text,
  // so the diff is still readable in monochrome.
  const addText = await cv.locator(".cv-d-add").first().innerText();
  expect(addText.trim().startsWith("+")).toBe(true);
});

test("every concept has a real artifact, and none overflows on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // A lesson from each of the two families the pass touched: cloud (IaC/cost
  // artifacts) and direction (memos and diffs).
  for (const id of ["cloud-platform-l7", "direction-influence-l6"]) {
    await openLesson(page, id);
    await enterConcept(page, 0);
    for (let i = 0; i < 3; i++) {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${id} concept ${i} overflows`).toBeLessThanOrEqual(2);
      // Widget, code or a system diagram — not text-only.
      const hasArtifact = await page.evaluate(
        () => !!document.querySelector(".lesson-content .cv, .lesson-content .viz, .lesson-content .schematic"),
      );
      expect(hasArtifact, `${id} concept ${i} has no artifact`).toBe(true);
      const next = page.getByRole("button", { name: /→/ }).last();
      if (!(await next.count())) break;
      await next.click();
      await page.waitForTimeout(250);
    }
  }
});
