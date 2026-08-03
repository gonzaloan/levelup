import { test, expect, type Page } from "@playwright/test";

// The Codex, driven end to end.
//
// A 200 does not prove this page works: browse/path/search are client state, the
// entry's fold is a native <details>, and the layered spine is derived at render
// time. So each mode is actually exercised, in both locales, at phone and desktop
// widths — and the anti-slop bars from src/design/anti-slop-checklist.md are
// asserted here rather than trusted.

const WIDTHS = [360, 768, 1280];

/**
 * Nothing is clipped or scrolled off the right edge.
 *
 * The first version measured `documentElement.scrollWidth - clientWidth`, and that
 * is BLIND on this app: an ancestor wrapper is `overflow-x: clip`, so the root
 * metric reads 0 while content is being cut off. It passed at 390px on a Codex
 * cluster whose cards were 395px wide, losing 29-60px of every heading, definition
 * and cost line with no way to scroll to it.
 *
 * So it measures every element's right edge against the viewport, scoped to the
 * PAGE CONTENT (`.cx`) rather than the whole document.
 *
 * Two deliberate exclusions:
 *   `.sky`        — the ambient starfield is aria-hidden decoration that bleeds
 *                   past the edge on purpose.
 *   the header    — `.mode-switch` in the shared nav overflows by 283px at 768px on
 *                   EVERY page (measured identically on /en/learn/), so it predates
 *                   this module and is not the Codex's to fix. It is worth fixing;
 *                   failing the Codex's suite for it would just mean this guard gets
 *                   deleted, and then the clipping it exists to catch comes back.
 */
async function noHorizontalScroll(page: Page, where: string) {
  const result = await page.evaluate(() => {
    const vw = window.innerWidth;
    const scope = document.querySelector(".cx") ?? document.body;
    const past = [...scope.querySelectorAll<HTMLElement>("*")]
      .filter((el) => !el.closest(".sky"))
      .filter((el) => el.getBoundingClientRect().right > vw + 2)
      .slice(0, 5)
      .map((el) => `${(el.className || el.tagName).toString().slice(0, 40)} @${Math.round(el.getBoundingClientRect().right)}`);
    return { past };
  });
  expect(result.past, `Codex content past the right edge: ${where}`).toEqual([]);
}

for (const locale of ["en", "es"]) {
  test(`codex browse renders entries (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/codex/`);
    await expect(page.locator("h1").first()).toBeVisible();

    // An entry must show its definition and its COST without any interaction.
    // The cost is the module's editorial position; if it were behind the fold the
    // page would be a glossary.
    const first = page.locator(".cx-entry").first();
    await expect(first).toBeVisible();
    await expect(first.locator(".cx-def")).toBeVisible();
    await expect(first.locator(".cx-pair-cost")).toBeVisible();
    await expect(first.locator(".cx-cheaper")).toBeVisible();

    // The fold starts CLOSED and opens. Native <details>, so this also proves the
    // keyboard/no-JS path exists.
    const fold = first.locator(".cx-fold").first();
    await expect(fold.locator(".cx-foldbody")).toBeHidden();
    await fold.locator("summary").click();
    await expect(fold.locator(".cx-foldbody")).toBeVisible();

    // Every entry is checkable — a reference without sources rots silently.
    await expect(first.locator(".cx-source a")).toHaveAttribute("href", /^https?:\/\//);

    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await noHorizontalScroll(page, `codex browse @${w}`);
    }
    await page.screenshot({ path: `test-results/codex-browse-${locale}.png`, fullPage: true });
  });

  test(`codex search finds an entry, accents optional (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/codex/`);
    // "chunking" is the cluster the whole reference is anchored on, so it is the
    // one term guaranteed to exist in both locales.
    await page.locator("#cx-q").fill("chunking");
    await expect(page.locator(".cx-hit").first()).toBeVisible();
    const hits = await page.locator(".cx-hit").count();
    expect(hits, "chunking must match several entries").toBeGreaterThan(1);

    // Diacritic folding: an unaccented query must reach accented Spanish text.
    // This is the bilingual correctness requirement, not a nicety.
    await page.locator("#cx-q").fill("evaluacion");
    const folded = await page.locator(".cx-hit").count();
    await page.locator("#cx-q").fill("evaluación");
    const accented = await page.locator(".cx-hit").count();
    expect(folded, "unaccented query must match the accented text").toBe(accented);

    await page.locator("#cx-q").fill("zzzznotathing");
    await expect(page.locator(".cx-hit")).toHaveCount(0);
  });

  test(`codex reading path draws a layered spine (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/codex/`);
    await page.getByRole("tab", { name: /reading path|ruta de lectura/i }).click();

    const bands = page.locator(".cx-band");
    await expect(bands.first()).toBeVisible();
    expect(await bands.count(), "the spine needs more than one layer to be a path").toBeGreaterThan(1);

    // Depth must DESCEND down the page: the copy says "read bottom to top", so
    // layer 0 has to be the last band. If this inverts, the instruction lies.
    const depths = await bands.evaluateAll((els) =>
      els.map((e) => Number(e.getAttribute("data-depth")))
    );
    expect(depths[depths.length - 1], "layer 0 must close the spine").toBe(0);
    for (let i = 1; i < depths.length; i++) {
      expect(depths[i], "bands must descend").toBeLessThan(depths[i - 1]);
    }

    // Every node is a real, reachable link.
    const node = page.locator(".cx-node").first();
    await expect(node).toBeVisible();
    await expect(node).toHaveAttribute("href", /^#e-/);

    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await noHorizontalScroll(page, `codex path @${w}`);
    }
    await page.screenshot({ path: `test-results/codex-path-${locale}.png`, fullPage: true });
  });
}

test("the Codex says what it is NOT", async ({ page }) => {
  // The most useful sentence on a reference page is the one that stops a learner
  // treating it as a lesson. If this ever disappears, the module has drifted.
  await page.goto("/en/codex/");
  await expect(page.locator(".cx-isnot")).toContainText(/reference, not a lesson/i);
});

test("a Codex entry cross-links into the ladder", async ({ page }) => {
  // The link that keeps the Codex from becoming a second copy of the curriculum.
  await page.goto("/en/codex/");
  const link = page.locator(".cx-taught-link").first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /\/en\/lesson\//);
  await link.click();
  await expect(page.locator("h1").first()).toBeVisible();
});

test("a lesson cross-links back into the Codex", async ({ page }) => {
  // The reverse direction. ai-engineering-l4 covers RAG retrieval quality, which
  // the chunking cluster deepens, so the link must appear on that lesson.
  await page.goto("/en/lesson/ai-engineering-l4/");
  await page.getByRole("button", { name: /begin|comenzar/i }).click();
  // Walk to the first concept pane that offers a Codex link.
  //
  // Concepts carrying a `predict` block withhold everything below the definition
  // until the prediction resolves — including the Codex links, which name the entry
  // that answers the question. So resolve it (skipping is enough) before looking.
  // Three of this lesson's six concepts have one.
  let found = false;
  for (let i = 0; i < 8; i++) {
    const skip = page.getByRole("button", { name: /Skip the prediction|Saltar la predicción/i });
    if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(200); }
    if (await page.locator(".cp-codex-link").count() > 0) { found = true; break; }
    const next = page.locator(".cp-next");
    if (await next.count() === 0) break;
    await next.click();
    await page.waitForTimeout(200);
  }
  expect(found, "an AI lesson concept should offer a Codex lookup").toBe(true);
  // `trailingSlash: true` in the export, so the fragment sits after the slash:
  // `/en/codex/#e-<slug>`. Matching `/codex#e-` failed on a link that works.
  const link = page.locator(".cp-codex-link").first();
  await expect(link).toHaveAttribute("href", /\/codex\/#e-/);

  // FOLLOW IT. Asserting the href only proved the link was well-formed, and it was
  // — while 80 of the 92 cross-links the spine renders landed on a cluster page
  // that did not contain the entry they named. Browse shows one cluster at a time,
  // and nothing read `location.hash`. The destination is the assertion.
  const href = (await link.getAttribute("href"))!;
  const slug = href.split("#")[1];
  await link.click();
  await expect(page.locator(`#${slug}`)).toBeVisible();
  await expect(page.locator(`#${slug} .cx-def`)).toBeVisible();
});

test("every cluster is reachable on a phone", async ({ page }) => {
  // The Codex reuses `.ws-sidebar`, which 09-study-kit.css hides below 1051px —
  // correct for the Learn hub, and a real defect here, where it was the ONLY way
  // to change cluster. Measured before the fix: 11 clusters in the DOM, 0 operable
  // at 390/768/1024px, so a learner could reach 12 of the 107 entries the page
  // advertises.
  for (const w of [360, 390, 768, 1024]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/en/codex/");
    const pick = page.locator(".cx-clusterpick select");
    await expect(pick, `no cluster control at ${w}px`).toBeVisible();
    const options = await pick.locator("option").count();
    expect(options, `only ${options} clusters offered at ${w}px`).toBeGreaterThan(10);

    // And it must actually switch the cluster, not just look like a control.
    const before = await page.locator(".cx-cluster-title").innerText();
    await pick.selectOption({ index: 4 });
    await expect(page.locator(".cx-cluster-title")).not.toHaveText(before);
  }
});

test("no cluster clips its content on a phone", async ({ page }) => {
  // EVERY cluster, not just the first. The clipping defect this guards against
  // lived in Evaluation — the 5th cluster and the largest at 18 entries — and the
  // browse test only ever looked at the default cluster, so it never saw it. One
  // entry's unbreakable identifier (`gen_ai.invoke_agent.inference_calls`) set the
  // grid track for all 18 sibling cards to 395px inside a 390px viewport.
  for (const w of [360, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/en/codex/");
    const count = await page.locator(".cx-clusterpick select option").count();
    expect(count, "expected every cluster to be offered").toBeGreaterThan(10);
    for (let i = 0; i < count; i++) {
      await page.locator(".cx-clusterpick select").selectOption({ index: i });
      const name = await page.locator(".cx-cluster-title").innerText();
      await noHorizontalScroll(page, `cluster "${name}" @${w}px`);
      // And the card must fit, not merely avoid triggering a scrollbar.
      const fits = await page.locator(".cx-entry").first().evaluate(
        (el) => Math.round(el.getBoundingClientRect().width) <= window.innerWidth
      );
      expect(fits, `cluster "${name}" card is wider than the viewport @${w}px`).toBe(true);
    }
  }
});

test("a deep link opens the right cluster and lands on the entry", async ({ page }) => {
  // The fragment is the whole contract of a cross-link. `serving` is not the first
  // cluster, so arriving at one of its entries proves the hash actually drove the
  // cluster selection rather than the default happening to be right.
  await page.goto("/en/codex/#e-continuous-batching");
  const target = page.locator("#e-continuous-batching");
  await expect(target).toBeVisible();
  await expect(target.locator(".cx-def")).toBeVisible();
  await expect(page.locator(".cx-cluster-title")).toContainText(/serving|servicio/i);
});

test("no emoji bullets and no violet slop in the Codex", async ({ page }) => {
  await page.goto("/en/codex/");
  const text = await page.locator(".cx").innerText();
  // The project's hard bar: no emoji, ever.
  expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2728}\u{1F680}]/u);
  // The reserved AI-slop violet is for locked states only, never a surface.
  const bg = await page.locator(".cx-entry").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toContain("107, 90, 166");
});

test("the Codex renders in the pixel theme too", async ({ page }) => {
  // Both themes are first-class in every component — a Codex that only works in
  // Studio would be a half-shipped module.
  await page.goto("/en/codex/");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "pixel"));
  await expect(page.locator(".cx-entry").first()).toBeVisible();
  const radius = await page.locator(".cx-entry").first().evaluate((el) => getComputedStyle(el).borderRadius);
  // Pixel is zero-radius by identity.
  expect(radius).toBe("0px");
  await page.screenshot({ path: "test-results/codex-pixel.png", fullPage: true });
});
