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

// ── The cluster primer ────────────────────────────────────────────────────
//
// The primer is the level ABOVE the entries, and it exists because 107 well-formed
// entries did not add up to a teachable reference: a cluster oriented the reader
// with one line of tagline and then handed over up to 18 sibling techniques.
//
// vitest cannot cover any of what follows. It is node-only in this project (no
// jsdom by design), so it can prove the JSX contains a field and the JSON is
// well-formed — not that the descent is ABOVE the entries on screen, not that it
// is visible without interaction, and not that a family chip actually moves the
// reader to the entry it names. Those are the three things that make the primer
// work, so they are asserted here against a real browser.

for (const locale of ["en", "es"]) {
  test(`the cluster primer orients before the entries (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/codex/`);

    const primer = page.locator(".cx-primer");
    await expect(primer).toBeVisible();

    // All five parts of the descent, with NO interaction. The whole design
    // position is that a primer does not fold: an entry is consulted, so hiding
    // its mechanism is right, but a primer is what a lost reader needs and a fold
    // is what a lost reader does not open.
    await expect(primer.locator(".cx-primer-def")).toBeVisible();
    await expect(primer.locator(".cx-primer-why")).toBeVisible();
    await expect(primer.locator(".cx-primer-axis")).toBeVisible();
    await expect(primer.locator(".cx-family").first()).toBeVisible();
    await expect(primer.locator(".cx-choose li").first()).toBeVisible();

    // ABOVE the entries, geometrically. A primer that rendered after the entry
    // list would satisfy every data gate and orient nobody — the reader would meet
    // 12 techniques first and the explanation of them last.
    const pTop = await primer.evaluate((el) => el.getBoundingClientRect().top);
    const eTop = await page.locator(".cx-entry").first().evaluate((el) => el.getBoundingClientRect().top);
    expect(pTop, "the primer must sit above the entries it orients").toBeLessThan(eTop);

    // The families are a TOTAL partition, so the chips must account for every
    // entry rendered in this cluster. This is the load-bearing content property,
    // checked here in the rendered DOM rather than only in the JSON.
    const chips = await primer.locator(".cx-famchip").count();
    const entries = await page.locator(".cx-entry").count();
    expect(chips, "every entry in the cluster needs a chip in exactly one family").toBe(entries);

    // More than one family, or the grouping is a rename of the entry list.
    expect(await primer.locator(".cx-family").count()).toBeGreaterThan(1);

    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await noHorizontalScroll(page, `codex primer @${w}`);
      // The definition must survive the narrowest viewport: it is the sentence a
      // reader who does not own the vocabulary depends on.
      await expect(primer.locator(".cx-primer-def")).toBeVisible();
    }
    await page.screenshot({ path: `test-results/codex-primer-${locale}.png`, fullPage: true });
  });
}

test("a family chip navigates to the entry it names", async ({ page }) => {
  // The primer doubles as the cluster's table of contents, so a chip is
  // NAVIGATION, not decoration. This module has already shipped the failure this
  // guards: 80 of 92 cross-links pointed at anchors that were not on the page —
  // the link worked and the destination did not.
  await page.goto("/en/codex/");
  const chip = page.locator(".cx-primer .cx-famchip").first();
  const href = await chip.getAttribute("href");
  expect(href, "a chip must point at an entry anchor").toMatch(/^#e-/);

  const slug = href!.replace(/^#e-/, "");
  const target = page.locator(`#e-${slug}`);
  await expect(target, `#e-${slug} must exist on the page the chip is on`).toHaveCount(1);

  await chip.click();
  // The entry is in the viewport after the jump, and it is a real entry card.
  await expect(target).toBeVisible();
  await expect(target.locator(".cx-def")).toBeVisible();
});

test("the primer renders in the pixel theme too", async ({ page }) => {
  await page.goto("/en/codex/");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "pixel"));
  const primer = page.locator(".cx-primer");
  await expect(primer).toBeVisible();
  await expect(primer.locator(".cx-primer-def")).toBeVisible();
  // Pixel is zero-radius by identity, and the primer keeps the thicker left rail
  // that distinguishes it from an entry card once both are hard-shadowed frames.
  const style = await primer.evaluate((el) => {
    const s = getComputedStyle(el);
    return { radius: s.borderRadius, left: parseFloat(s.borderLeftWidth), top: parseFloat(s.borderTopWidth) };
  });
  expect(style.radius).toBe("0px");
  expect(style.left, "the left rail marks the primer as the level above").toBeGreaterThan(style.top);
  await page.screenshot({ path: "test-results/codex-primer-pixel.png", fullPage: true });
});

// ── The primer's two access surfaces ──────────────────────────────────────
//
// The primers shipped invisible to both surfaces a reader actually arrives on: the
// search box, which indexed only entry fields (typing "context engineering" returned
// ZERO results from a reference that had just defined it), and the reading path,
// which is the front-to-back reader they were written for.
//
// These are Playwright rather than vitest because both are client state — search
// results, mode switches, a <details>, and a chip whose target only exists after a
// navigation. Source-reading cannot see any of it.

test("searching a cluster's own name returns the cluster, with its primer", async ({ page }) => {
  await page.goto("/en/codex/");
  await page.locator("#cx-q").fill("context engineering");

  const hit = page.locator(".cx-clusterhit");
  await expect(hit).toHaveCount(1);
  // The orientation itself, not just a title row — that is the point of the change.
  await expect(hit.locator(".cx-primer-def")).toBeVisible();
  await expect(hit.locator(".cx-primer-axis")).toBeVisible();
  await expect(hit.locator(".cx-family").first()).toBeVisible();

  // A cluster answer must be distinguishable from a technique answer.
  await page.locator("#cx-q").fill("hnsw");
  await expect(page.locator(".cx-hit .cx-entry").first()).toBeVisible();
});

test("a family chip from a SEARCH result lands on a real entry", async ({ page }) => {
  // The regression this guards: in search mode the cluster's entries are not
  // rendered, so the chip's `#e-<slug>` anchor resolved to nothing — measured 0
  // targets on the page. Same class as the 80-of-92 dead cross-links this module
  // shipped once: the link worked and the destination did not.
  await page.goto("/en/codex/");
  await page.locator("#cx-q").fill("context engineering");

  const chip = page.locator(".cx-clusterhit .cx-famchip").first();
  const href = (await chip.getAttribute("href"))!;
  expect(href).toMatch(/^#e-/);
  // Precondition: the target genuinely is NOT on the page yet. If this ever stops
  // being true the test still passes, but it would no longer be testing anything.
  await expect(page.locator(href)).toHaveCount(0);

  await chip.click();
  // Left search, opened the cluster, and scrolled to the entry now that it exists.
  await expect(page.locator(".cx-clusterhit")).toHaveCount(0);
  await expect(page.locator(href)).toBeVisible();
  await expect(page.locator(`${href} .cx-def`)).toBeVisible();
});

test("the reading path defines every family before the climb", async ({ page }) => {
  await page.goto("/en/codex/");
  await page.getByRole("tab", { name: /reading path|ruta de lectura/i }).click();

  const fold = page.locator(".cx-path-families");
  await expect(fold).toBeVisible();
  // Closed by default: the spine must stay the first thing on screen.
  await expect(fold.locator(".cx-path-deflist")).toBeHidden();
  await fold.locator("summary").click();

  const rows = fold.locator(".cx-path-deflist > div");
  await expect(rows).toHaveCount(11);
  // Every line is a real sentence, not an empty or truncated fragment.
  for (const text of await fold.locator(".cx-path-deflist dd").allInnerTexts()) {
    expect(text.trim().length, `a family definition is too short: "${text}"`).toBeGreaterThan(40);
    expect(text.trim()).toMatch(/[.!?]$/);
  }

  // A term takes you into that cluster, in browse, with its primer showing.
  await fold.locator(".cx-path-defterm").nth(3).click();
  await expect(page.locator(".cx-primer .cx-primer-def")).toBeVisible();
  await expect(page.locator(".cx-entry").first()).toBeVisible();
});

test("cluster search works in Spanish and in the pixel theme", async ({ page }) => {
  await page.goto("/es/codex/");
  await page.locator("#cx-q").fill("ingenieria de contexto");   // unaccented on purpose
  const hit = page.locator(".cx-clusterhit");
  await expect(hit).toHaveCount(1);
  await expect(hit.locator(".cx-primer-def")).toBeVisible();

  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "pixel"));
  await expect(hit.locator(".cx-primer")).toBeVisible();
  const radius = await hit.locator(".cx-primer").evaluate((el) => getComputedStyle(el).borderRadius);
  expect(radius).toBe("0px");
});

// ── Landing, not just state ───────────────────────────────────────────────
//
// Two defects an access review found in the primer's own navigation, both of the
// same shape: the state changed and the reader did not move. They are Playwright
// because scroll position is the assertion, and nothing else can see it.

/** The sticky header's height. Anything at a smaller `top` is hidden behind it. */
const NAV_H = 61;

/**
 * Did the reader actually ARRIVE at this element?
 *
 * `toBeInViewport()` is not enough, and trusting it is how the second version of this
 * defect shipped: `openClusterAt` scrolled the cluster heading to `top: 0`, which is
 * inside the viewport and 100% behind the 61px sticky header — the word "Chunking" sat
 * under the logo and the tagline was the first readable line. The assertion passed at
 * 1280, 768 and 360. A geometric miss of 693px became a geometric miss of 37px, and
 * the test could not tell the difference.
 *
 * So this asserts the two things a reader depends on: the top edge is below the header,
 * and the element is genuinely hit-testable at its own centre (which catches occlusion
 * by any future chrome, not just this header).
 */
async function assertArrived(page: Page, selector: string, where: string) {
  // WAIT FOR THE SCROLL TO SETTLE FIRST. The app scrolls with `behavior: "smooth"`
  // outside reduced-motion, so measuring immediately catches the animation mid-flight
  // — the first version of this helper read `top: -303px` on a target that lands
  // correctly at 76px. Poll `scrollY` until it stops changing rather than sleeping a
  // fixed amount, so the check is not a race on a slow machine.
  await page.waitForFunction(() => {
    const w = window as unknown as { __lastY?: number; __still?: number; __t0?: number };
    const y = Math.round(window.scrollY);
    if (w.__lastY === y) { w.__still = (w.__still ?? 0) + 1; } else { w.__still = 0; w.__lastY = y; }
    // A MINIMUM settle time as well as three equal samples. Smooth scrolling has
    // intermediate plateaus — a review measured 112-176ms of unchanging `scrollY`
    // mid-flight, including one genuine direction reversal — and three fast samples can
    // land inside one. That is the most likely cause of a 3-in-19 serial flake on the
    // double-click test, which always reported "occluded" on the second click. 250ms is
    // longer than the longest plateau measured and shorter than the animation.
    w.__t0 ??= performance.now();
    return (w.__still ?? 0) >= 3 && performance.now() - w.__t0 > 250;
  }, undefined, { timeout: 10_000 });
  await page.evaluate(() => {
    const w = window as unknown as { __lastY?: number; __still?: number; __t0?: number };
    w.__lastY = undefined; w.__still = 0; w.__t0 = undefined;   // reset, so a later call re-measures
  });

  // Must be genuinely visible, not merely positioned. This is one of the two gaps a
  // review found in the first version: `visibility: hidden` on the landed heading kept
  // `top` at 76 and made `elementFromPoint` return the ANCESTOR, which the old
  // `hit.contains(el)` clause accepted — so an invisible target "arrived".
  await expect(page.locator(selector), `${where}: target is not visible`).toBeVisible();

  const geom = await page.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect();
    // Hit-test just INSIDE the top edge, not the centre. An entry card is taller than
    // the viewport, so its centre point is off-screen and `elementFromPoint` returned
    // null — the helper reported "occluded by <?>" on an element that had arrived
    // perfectly. The top edge is also the part that matters: it is what the sticky
    // header covers, and what the reader needs to see to know where they are.
    const x = Math.min(r.left + r.width / 2, window.innerWidth - 1);
    const y = Math.min(r.top + 4, window.innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    return {
      top: Math.round(r.top),
      viewportH: window.innerHeight,
      // `el.contains(hit)` only: a child of the target at that point is the target
      // arriving. The reverse — an ANCESTOR at that point — means the target itself is
      // not painting there, which is the invisible-arrival case above.
      occluder: hit && (hit === el || el.contains(hit)) ? null : (hit?.tagName ?? "nothing"),
    };
  });
  expect(geom.top, `${where}: top ${geom.top}px is under the sticky header`).toBeGreaterThanOrEqual(NAV_H);
  // The other gap: `top` was bounded below by the header and not above by the viewport.
  // A reinstated defect measured `top: 892` in a 900px viewport — 8px of a 1382px card
  // on screen, no occluder, both assertions passing. Caught then only by luck of which
  // element the clamped probe hit.
  expect(geom.top, `${where}: top ${geom.top}px leaves nothing on screen`)
    .toBeLessThan(geom.viewportH - 40);
  expect(geom.occluder, `${where}: occluded by <${geom.occluder}>`).toBeNull();
}

test("clicking the SAME family chip twice still lands both times", async ({ page }) => {
  // The first version set `location.hash` and relied on `hashchange` to scroll.
  // Assigning a hash the value it already holds emits no event, so the second click
  // switched cluster and never scrolled — measured with the target 1212px below the
  // fold at 1280px and 1791px at 360px, viewport parked mid-primer.
  await page.goto("/en/codex/");
  const search = async () => {
    await page.locator("#cx-q").fill("context engineering");
    await expect(page.locator(".cx-clusterhit")).toHaveCount(1);
  };

  await search();
  const chip = page.locator(".cx-clusterhit .cx-famchip").first();
  const href = (await chip.getAttribute("href"))!;
  await chip.click();
  await assertArrived(page, href, "first chip click");

  // Back to search and click the very same chip: the hash already points there.
  await search();
  await page.locator(".cx-clusterhit .cx-famchip").first().click();
  await assertArrived(page, href, "second chip click");
});

test("'Open this cluster' puts the cluster's heading on screen", async ({ page }) => {
  // The button sits below a full primer, so changing cluster without scrolling left
  // the heading 693px above the viewport at 1280px and 1558px at 360px. A button
  // that promises to open something has to show you the thing it opened.
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/en/codex/");
    await page.locator("#cx-q").fill("security");
    await page.locator(".cx-openbtn").first().click();
    await assertArrived(page, ".cx-cluster .cx-cluster-title", `open-btn @${width}px`);
  }
});

test("a path-mode glossary term lands on its cluster heading", async ({ page }) => {
  // Same rule, same fix, different caller — it sits below the spine's intro.
  await page.goto("/en/codex/");
  await page.getByRole("tab", { name: /reading path|ruta de lectura/i }).click();
  await page.locator(".cx-path-families summary").click();
  await page.locator(".cx-path-defterm").nth(5).click();
  await assertArrived(page, ".cx-cluster .cx-cluster-title", "path glossary term");
  await expect(page.locator(".cx-primer .cx-primer-def")).toBeVisible();
});
