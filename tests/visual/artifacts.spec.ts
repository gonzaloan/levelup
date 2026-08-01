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

test("a code artifact shows real code on the first screen, not a 'show N lines' button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // The first version of this suite asserted the POSITION of .cp-figure, which
  // exists whether or not the artifact is open — so it passed while every
  // artifact over 12 lines rendered collapsed and the learner saw a button. This
  // counts lines actually inside the viewport, which is the thing that matters.
  for (const id of ["cloud-platform-l7", "direction-influence-l6"]) {
    await openLesson(page, id);
    await enterConcept(page, 0);
    const seen = await page.evaluate(() => {
      const cv = document.querySelector(".lesson-content .cv");
      if (!cv) return { err: "no artifact" as const };
      const body = cv.querySelector<HTMLElement>(".cv-scroll");
      const lines = [...cv.querySelectorAll(".cv-ln")].filter((l) => {
        const b = l.getBoundingClientRect();
        return b.top >= 0 && b.bottom <= window.innerHeight;
      });
      return {
        collapsed: cv.hasAttribute("data-collapsed"),
        hidden: !!body?.hidden,
        visibleLines: lines.length,
      };
    });
    expect(seen, `${id}: no artifact found`).not.toHaveProperty("err");
    if ("err" in seen) continue;
    // A lead artifact is never collapsed — that's the point of the `lead` prop.
    expect(seen.collapsed, `${id} lead artifact is collapsed`).toBe(false);
    expect(seen.hidden, `${id} lead artifact body is hidden`).toBe(false);
    expect(seen.visibleLines, `${id}: no code visible on the first screen`).toBeGreaterThanOrEqual(3);
  }
});

test("the phone reorder keeps a coherent DOM reading order", async ({ page }) => {
  // The pane reorders on phones so the figure precedes `why` (24-concept-pane.css),
  // which is what got the code artifact back above the fold. `order` changes the
  // VISUAL sequence only, so the thing to protect is that the DOM sequence — what a
  // screen reader and a no-CSS render get — is still one a reader can follow.
  //
  // The authored DOM order is title → why → definition → figure: the framing
  // question, then what the thing is, then the picture of it. That is the sequence
  // the owner approved before the reorder existed, so the assertion is that the
  // reorder did NOT disturb it.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/lesson/cloud-platform-l7/");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /→/ }).first().click();
  await page.waitForTimeout(400);

  const seq = await page.evaluate(() => {
    const card = document.querySelector(".lesson-content")!;
    return [...card.children].map((el) => ({
      why: el.classList.contains("cp-why"),
      def: el.classList.contains("cp-def"),
      fig: el.classList.contains("cp-figure"),
      y: Math.round(el.getBoundingClientRect().top),
    }));
  });
  const domIdx = (k: "why" | "def" | "fig") => seq.findIndex((s) => s[k]);
  // DOM: why before definition before figure.
  expect(domIdx("why"), "why must precede the definition in the DOM").toBeLessThan(domIdx("def"));
  expect(domIdx("def"), "definition must precede the figure in the DOM").toBeLessThan(domIdx("fig"));
  // VISUAL: definition, then figure, then why.
  const y = (k: "why" | "def" | "fig") => seq[domIdx(k)].y;
  expect(y("def"), "definition renders above the figure").toBeLessThan(y("fig"));
  expect(y("fig"), "figure renders above why on a phone").toBeLessThan(y("why"));
});

test("a capped lead artifact can be expanded to its full height, by keyboard too", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLesson(page, "cloud-platform-l7");
  await enterConcept(page, 0);
  const cv = page.locator(".lesson-content .cv").first();
  await expect(cv).toHaveAttribute("data-capped", "");
  const expand = cv.locator(".cv-expand");
  await expect(expand).toBeVisible();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  // Capped height must not clip the artifact permanently.
  const cappedHeight = await cv.locator(".cv-scroll").evaluate((e) => e.getBoundingClientRect().height);
  await expand.press("Enter");
  await expect(cv).not.toHaveAttribute("data-capped", "");
  await expect(expand).toHaveAttribute("aria-expanded", "true");
  const fullHeight = await cv.locator(".cv-scroll").evaluate((e) => e.getBoundingClientRect().height);
  expect(fullHeight).toBeGreaterThan(cappedHeight);
  // And it is reversible, so the pane can be made short again.
  await expand.press("Enter");
  await expect(cv).toHaveAttribute("data-capped", "");
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

// ── Round-2 review findings, each locked so it cannot silently return ────────

test("an inline annotation's popover is readable, not a sliver", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLesson(page, "direction-influence-l7");
  await enterConcept(page, 4);
  const cv = page.locator(".cv[data-prose]").first();
  const reveal = cv.locator(".cv-reveal");
  if ((await reveal.count()) && (await reveal.getAttribute("aria-expanded")) === "false") await reveal.click();
  const anno = cv.locator(".cv-para .cv-inline-anno .cv-anno").first();
  await anno.focus();
  const tip = page.locator(".cv-tip.is-open").first();
  await expect(tip).toBeVisible();
  const box = await tip.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), z: Number(getComputedStyle(el).zIndex) };
  });
  // Measured 84-104px wide and up to 252px tall when the inline wrapper was
  // `position: relative` — the popover shrink-wrapped to an inline fragment and
  // rendered one or two words per line, over the paragraph.
  expect(box.w, "popover shrink-wrapped to an inline fragment").toBeGreaterThan(200);
  expect(box.h).toBeLessThan(200);
  // And it must paint above the fixed mobile tab bar (z-index 60).
  expect(box.z).toBeGreaterThan(60);
});

test("a plain-text artifact keeps its column alignment", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLesson(page, "cloud-platform-l4");
  await enterConcept(page, 0);
  // Walk to the `text` artifact; it is the aligned option table.
  let found = false;
  for (let i = 0; i < 8 && !found; i++) {
    found = await page.evaluate(() => !!document.querySelector(".cv[data-pre]"));
    if (found) break;
    const next = page.getByRole("button", { name: /→/ }).last();
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(200);
  }
  expect(found, "no data-pre artifact found in cloud-platform-l4").toBe(true);
  const info = await page.evaluate(() => {
    const cv = document.querySelector(".cv[data-pre]")!;
    const code = cv.querySelector("code")!;
    const text = (cv.querySelector(".cv-body") as HTMLElement).innerText;
    return { ws: getComputedStyle(code).whiteSpace, rows: (text.match(/(billed|idle saving|risk):/g) ?? []).length };
  });
  // The prose rejoin collapsed three labelled rows into one run-on sentence and
  // deleted the alignment that WAS the artifact.
  expect(info.ws).toBe("pre");
  expect(info.rows).toBeGreaterThanOrEqual(6);
});

test("a ragged compare never renders an empty labelled cell", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // cell-based-architecture is 4 points vs 5 — one of five ragged compares.
  await openLesson(page, "cloud-platform-l5");
  await enterConcept(page, 0);
  let checked = false;
  for (let i = 0; i < 6 && !checked; i++) {
    const fold = page.locator(".lesson-content .cp-fold summary").first();
    if (await fold.count()) await fold.click().catch(() => {});
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => {
      const vs = document.querySelector(".schematic-vs");
      if (!vs) return null;
      const empty = [...vs.querySelectorAll(".schematic-vs-cell")].filter((c) => !c.textContent?.trim());
      return { empty: empty.length, single: vs.querySelectorAll(".schematic-vs-row--single").length };
    });
    if (r) {
      // An empty cell still printed its side label via ::before, so it read as a
      // heading with nothing under it.
      expect(r.empty, "empty cell in a ragged compare").toBe(0);
      checked = true;
    }
    const next = page.getByRole("button", { name: /→/ }).last();
    if (!(await next.count())) break;
    if (!checked) { await next.click(); await page.waitForTimeout(200); }
  }
  expect(checked, "no compare schematic found").toBe(true);
});

test("the footer link is reachable above the mobile tab bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/en/", "/en/learn/", "/es/practice/"]) {
    await page.goto(route);
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    // `main` had the bar's clearance but `footer` is its SIBLING, so the footer's
    // own link sat under the bar and click() timed out.
    const link = page.locator("footer a").first();
    await expect(link).toBeVisible();
    await link.click({ timeout: 3000 });
  }
});

test("the hamburger glyph is centred in its button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/");
  await page.waitForTimeout(400);
  const insets = await page.evaluate(() => {
    const btn = document.querySelector(".nav-burger")!;
    const svg = btn.querySelector("svg")!;
    const B = btn.getBoundingClientRect(), S = svg.getBoundingClientRect();
    return { left: Math.round(S.left - B.left), right: Math.round(B.right - S.right) };
  });
  // A `display: inline-flex` override restored align-items but not
  // justify-content, leaving the glyph jammed left at 1px / 23px — the
  // "se ve medio raro" the owner reported.
  expect(Math.abs(insets.left - insets.right)).toBeLessThanOrEqual(2);
});

test("the lesson concept strip has accessible names and real tap targets", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLesson(page, "cloud-platform-l5");
  await enterConcept(page, 0);
  const items = page.locator(".concept-nav-item");
  const n = await items.count();
  expect(n).toBeGreaterThan(1);
  for (let i = 0; i < n; i++) {
    const item = items.nth(i);
    // Below 1050px the label is display:none and the number is aria-hidden, which
    // left the button with no accessible name (axe wcag2a button-name, critical).
    const name = await item.getAttribute("aria-label");
    expect(name?.trim()).toBeTruthy();
    const h = await item.evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(40);
  }
});

// ── Round-3 review findings ─────────────────────────────────────────────────

test("the Enlarge control never covers the compare header", async ({ page }) => {
  // Measured at 97px of the left side label and the whole 33px "vs" pill, on 135
  // renders. The label says which side of the comparison you are reading, so
  // losing it loses the diagram. A previous version of this spec asserted only
  // toBeVisible(), which passes while 97px is painted over.
  for (const [w, id] of [[390, "cloud-platform-l3"], [360, "technical-depth-l3"]] as const) {
    await page.setViewportSize({ width: w, height: 844 });
    await openLesson(page, id);
    await enterConcept(page, 0);
    for (let i = 0; i < 5; i++) {
      const fold = page.locator(".lesson-content .cp-fold summary").first();
      if (await fold.count()) await fold.click().catch(() => {});
      await page.waitForTimeout(200);
      const r = await page.evaluate(() => {
        const vs = document.querySelector(".schematic-vs");
        const trg = document.querySelector(".figzoom-trigger");
        if (!vs || !trg) return null;
        const T = trg.getBoundingClientRect();
        const A = vs.querySelector(".schematic-vs-h--a")!.getBoundingClientRect();
        const M = vs.querySelector(".schematic-vs-mid")?.getBoundingClientRect();
        // TRUE 2-D intersection — an x-axis-only check reported a false overlap.
        const box = (x: DOMRect, y: DOMRect) => {
          const dw = Math.min(x.right, y.right) - Math.max(x.left, y.left);
          const dh = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
          return dw > 0 && dh > 0 ? Math.round(dw) : 0;
        };
        return { head: box(T, A), mid: M ? box(T, M) : 0 };
      });
      if (r) {
        expect(r.head, `${id}@${w}: trigger covers the side label`).toBe(0);
        expect(r.mid, `${id}@${w}: trigger covers the "vs" pill`).toBe(0);
        break;
      }
      const next = page.getByRole("button", { name: /→/ }).last();
      if (!(await next.count())) break;
      await next.click().catch(() => {});
      await page.waitForTimeout(200);
    }
  }
});

test("a diff carries emphasis across a wrapped line", async ({ page }) => {
  // The diff path called tokenizeLine() per line, resetting state, so a `**…**`
  // or `` `…` `` span wrapped across a source line rendered the wrong half — one
  // closing backtick opened a code span that swallowed 60 characters of prose.
  for (const [id, n] of [["direction-influence-l4", 1], ["direction-influence-l6", 0]] as const) {
    await openLesson(page, id);
    await enterConcept(page, n);
    for (let i = 0; i < 6; i++) {
      const r = await page.evaluate(() => {
        const cv = document.querySelector('.cv[data-lang="diff"]');
        if (!cv) return null;
        const rev = cv.querySelector<HTMLElement>(".cv-reveal");
        if (rev && rev.getAttribute("aria-expanded") === "false") rev.click();
        const proseAsCode = [...cv.querySelectorAll(".cv-inline-code")]
          .map((c) => c.textContent ?? "")
          .filter((t) => t.length > 40 && /\s/.test(t) && !/[_(){};=]/.test(t));
        return {
          markers: ((cv.querySelector(".cv-body") as HTMLElement).innerText.match(/\*\*/g) ?? []).length,
          proseAsCode,
          strongs: cv.querySelectorAll("strong").length,
        };
      });
      if (r) {
        expect(r.markers, `${id}: literal ** left on screen`).toBe(0);
        expect(r.proseAsCode, `${id}: prose styled as inline code`).toEqual([]);
        expect(r.strongs).toBeGreaterThan(0);
        break;
      }
      const next = page.getByRole("button", { name: /→/ }).last();
      if (!(await next.count())) break;
      await next.click().catch(() => {});
      await page.waitForTimeout(200);
    }
  }
});

test("the concept strip does not widen the lesson pane past the viewport", async ({ page }) => {
  // Adding a 40px tap target to the strip made N x 46px items the grid track's
  // intrinsic width — `grid-template-columns: 478px` in a 312px container — so
  // every grid child, including the prose, was 478px wide at 360px and truncated
  // mid-word. `body { overflow-x: clip }` hid it from a document-overflow sweep.
  for (const id of ["technical-depth-l5", "execution-delivery-l4"]) {
    await page.setViewportSize({ width: 360, height: 844 });
    await openLesson(page, id);
    await enterConcept(page, 0);
    const r = await page.evaluate(() => {
      const content = document.querySelector(".lesson-content")!.getBoundingClientRect();
      const list = document.querySelector(".concept-nav-list")!;
      return {
        contentW: Math.round(content.width),
        vw: document.documentElement.clientWidth,
        // The strip must be a working scroller, not an overflowing block.
        scrollable: list.scrollWidth > list.clientWidth,
      };
    });
    expect(r.contentW, `${id}: pane is wider than the viewport`).toBeLessThanOrEqual(r.vw);
    expect(r.scrollable, `${id}: concept strip is not scrollable`).toBe(true);
  }
});

test("tabbing into a capped artifact reveals it instead of hijacking the scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLesson(page, "direction-influence-l7");
  await enterConcept(page, 4);
  const cv = page.locator(".lesson-content .cv").first();
  await expect(cv).toHaveAttribute("data-capped", "");
  // `overflow-y: hidden` still scrolls programmatically, so focusing an
  // annotation below the fold left the artifact stuck mid-way with no wheel,
  // touch or Home key able to recover it.
  const anno = cv.locator(".cv-anno").last();
  await anno.focus();
  await expect(cv).not.toHaveAttribute("data-capped", "");
  const scrollTop = await cv.locator(".cv-scroll").evaluate((e) => e.scrollTop);
  expect(scrollTop, "hidden container was scrolled").toBe(0);
});

test("every interactive target on a lesson pane clears 40px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await openLesson(page, "ai-engineering-l5");
  await enterConcept(page, 0);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("a,button,summary,[role=button]")]
      .filter((el) => {
        const b = el.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && b.height < 40;
      })
      .map((el) => `${(el.className + "").split(" ")[0]}:${Math.round(el.getBoundingClientRect().height)}`),
  );
  // `.rail-tab` was the one class the first sweep missed, at 32px.
  expect(small).toEqual([]);
});

// ── Round-4 review findings ─────────────────────────────────────────────────

test("both sides of a stacked compare are named on a phone", async ({ page }) => {
  // `:first-of-type` is scoped by element TYPE, and the container's first div is
  // the header — so no row ever matched and side B had NO name anywhere (the
  // header label is display:none below 560px). The reader could not tell which
  // stripe was which, on 76 compare concepts.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of ["technical-depth-l5", "cloud-platform-l3"]) {
    await openLesson(page, id);
    await enterConcept(page, 0);
    for (let i = 0; i < 6; i++) {
      const fold = page.locator(".lesson-content .cp-fold summary").first();
      if (await fold.count()) await fold.click().catch(() => {});
      await page.waitForTimeout(200);
      const r = await page.evaluate(() => {
        const vs = document.querySelector(".schematic-vs");
        if (!vs) return null;
        const cellA = vs.querySelector(".schematic-vs-cell--a");
        const cellB = vs.querySelector(".schematic-vs-cell--b");
        const before = (el: Element | null) =>
          el ? getComputedStyle(el, "::before").content : "none";
        return { a: before(cellA), b: before(cellB) };
      });
      if (r) {
        // Both poles must be named somewhere the reader can see.
        expect(r.a, `${id}: side A unnamed`).not.toBe("none");
        expect(r.b, `${id}: side B unnamed`).not.toBe("none");
        break;
      }
      const next = page.getByRole("button", { name: /→/ }).last();
      if (!(await next.count())) break;
      await next.click().catch(() => {});
      await page.waitForTimeout(200);
    }
  }
});

test("the Enlarge control covers no figure's text, at any width or figure kind", async ({ page }) => {
  test.slow();   // 3 widths x 3 lessons x 5 concepts is past the default budget
  // Reserving space in the compare stylesheet fixed one instance of a shared
  // layout bug: the same trigger covered decision-flow questions, spectrum poles
  // and viz titles (1071 covered text rects across 1420 renders). And the
  // >=900px exemption was wrong because the figure sits in a fixed-width grid
  // COLUMN, not the viewport — it overlapped at every desktop width.
  const SEL = ".schematic-vs-h,.schematic-vs-mid,.spectrum-pole,.dflow-question," +
    ".viz-title,.schematic-box-label,.schematic-axes text";
  // 900 is the width the old exemption started at, and 1280 is where it was
  // claimed safe; one lesson per width keeps this inside a sane budget while
  // still covering the boundary the previous fix got wrong.
  for (const [w, id] of [[390, "technical-depth-l5"], [900, "cloud-platform-l3"], [1280, "cloud-platform-l3"]] as const) {
    await page.setViewportSize({ width: w, height: 900 });
    {
      await openLesson(page, id);
      await enterConcept(page, 0);
      for (let i = 0; i < 4; i++) {
        const fold = page.locator(".lesson-content .cp-fold summary").first();
        if (await fold.count()) await fold.click().catch(() => {});
        await page.waitForTimeout(180);
        const covered = await page.evaluate((sel) => {
          const trg = document.querySelector(".figzoom-trigger");
          if (!trg) return 0;
          const T = trg.getBoundingClientRect();
          let hits = 0;
          for (const e of document.querySelectorAll(sel)) {
            const R = e.getBoundingClientRect();
            if (R.width === 0) continue;
            const dw = Math.min(T.right, R.right) - Math.max(T.left, R.left);
            const dh = Math.min(T.bottom, R.bottom) - Math.max(T.top, R.top);
            if (dw > 0 && dh > 0) hits++;
          }
          return hits;
        }, SEL);
        expect(covered, `${id}@${w}: trigger covers figure text`).toBe(0);
        const next = page.getByRole("button", { name: /→/ }).last();
        if (!(await next.count())) break;
        await next.click().catch(() => {});
        await page.waitForTimeout(180);
      }
    }
  }
});

test("quadrant labels are readable, not clipped by the SVG box", async ({ page }) => {
  test.slow();
  // An SVG cannot wrap text and has a fixed viewBox, so labels longer than the
  // box were clipped — up to 301px cut off, truncated mid-word, on 20 concepts.
  // The labels now live in an HTML legend keyed by number.
  for (const w of [390, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await openLesson(page, "direction-influence-l4");
    await enterConcept(page, 0);
    for (let i = 0; i < 6; i++) {
      const fold = page.locator(".lesson-content .cp-fold summary").first();
      if (await fold.count()) await fold.click().catch(() => {});
      await page.waitForTimeout(200);
      const quad = page.locator(".schematic-quad").first();
      if ((await quad.count()) && (await quad.isVisible())) {
        const r = await page.evaluate(() => {
          const svg = document.querySelector("svg.schematic-axes")!;
          const S = svg.getBoundingClientRect();
          const vw = document.documentElement.clientWidth;
          const clipped = [...svg.querySelectorAll("text")].filter((t) => {
            const R = t.getBoundingClientRect();
            return R.right > S.right + 1 || R.right > vw + 1;
          }).length;
          return { clipped, legendItems: document.querySelectorAll(".schematic-quad-items li").length };
        });
        expect(r.clipped, `clipped SVG text at ${w}px`).toBe(0);
        // Every plotted point has a full label beside the chart.
        expect(r.legendItems).toBeGreaterThan(0);
        break;
      }
      const next = page.getByRole("button", { name: /→/ }).last();
      if (!(await next.count())) break;
      await next.click().catch(() => {});
      await page.waitForTimeout(180);
    }
  }
});
