import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:4180";
const b = await chromium.launch();
const out = [];

for (const locale of ["en", "es"]) {
  for (const [w, h] of [[1280, 900], [768, 900], [360, 740]]) {
    const ctx = await b.newContext({ viewportSize: { width: w, height: h } });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e)));
    p.on("console", (m) => { if (m.type() === "error") errs.push("console:" + m.text()); });
    const rec = { locale, w, errs };

    // ── B1: "Open this cluster" from a search cluster hit
    await p.goto(`${BASE}/${locale}/codex/`, { waitUntil: "networkidle" });
    await p.fill("#cx-q", "chunking");
    await p.waitForSelector(".cx-clusterhit .cx-openbtn", { timeout: 8000 });
    // scroll down so the button is reachable & we are deep in the page
    const btn = p.locator(".cx-clusterhit .cx-openbtn").first();
    await btn.scrollIntoViewIfNeeded();
    const beforeY = await p.evaluate(() => window.scrollY);
    await btn.click();
    await p.waitForTimeout(1400);
    {
      const head = p.locator(".cx-cluster .cx-cluster-title");
      const box = await head.boundingBox();
      const title = await head.textContent();
      rec.openBtn = {
        beforeScrollY: Math.round(beforeY),
        afterScrollY: Math.round(await p.evaluate(() => window.scrollY)),
        headingY: box ? Math.round(box.y) : null,
        inView: !!box && box.y >= -1 && box.y < h,
        title: title?.trim(),
        headerH: await p.evaluate(() => {
          const el = document.querySelector("header, .nav, .site-nav, .topbar");
          if (!el) return null;
          const cs = getComputedStyle(el);
          return cs.position === "sticky" || cs.position === "fixed" ? Math.round(el.getBoundingClientRect().height) : 0;
        }),
      };
    }

    // ── B2: path-mode glossary term
    await p.goto(`${BASE}/${locale}/codex/`, { waitUntil: "networkidle" });
    await p.locator('.cx-modes button[role="tab"]').nth(1).click();
    await p.waitForSelector("details.cx-path-families", { timeout: 8000 });
    const openBefore = await p.locator("details.cx-path-families").evaluate((d) => d.open);
    await p.locator("details.cx-path-families > summary").click();
    await p.waitForTimeout(200);
    const terms = await p.locator(".cx-path-defterm").count();
    // pick a term in the MIDDLE of the list so it is well below the fold
    const idx = Math.min(6, terms - 1);
    const termEl = p.locator(".cx-path-defterm").nth(idx);
    const wantedTitle = (await termEl.textContent())?.trim();
    await termEl.scrollIntoViewIfNeeded();
    const beforeY2 = await p.evaluate(() => window.scrollY);
    await termEl.click();
    await p.waitForTimeout(1400);
    {
      const head = p.locator(".cx-cluster .cx-cluster-title");
      const box = await head.boundingBox();
      const title = (await head.textContent())?.trim();
      rec.pathTerm = {
        detailsOpenByDefault: openBefore, terms, idx, wantedTitle,
        beforeScrollY: Math.round(beforeY2),
        afterScrollY: Math.round(await p.evaluate(() => window.scrollY)),
        headingY: box ? Math.round(box.y) : null,
        inView: !!box && box.y >= -1 && box.y < h,
        landedTitle: title,
        titleMatches: title === wantedTitle,
      };
    }
    out.push(rec);
    await ctx.close();
  }
}
console.log(JSON.stringify(out, null, 2));
await b.close();
