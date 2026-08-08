import { chromium } from "@playwright/test";

const BASE = "http://127.0.0.1:4180";
const b = await chromium.launch();

function inView(box, vh, vw) {
  if (!box) return false;
  return box.y >= -1 && box.y < vh && box.x < vw;
}

const results = [];

for (const locale of ["en", "es"]) {
  for (const [w, h] of [[1280, 900], [360, 740]]) {
    const ctx = await b.newContext({ viewportSize: { width: w, height: h } });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e)));
    p.on("console", (m) => { if (m.type() === "error") errs.push("console:" + m.text()); });
    await p.goto(`${BASE}/${locale}/codex/`, { waitUntil: "networkidle" });

    // Type a query that produces a cluster hit with a primer + chips.
    const q = locale === "en" ? "chunking" : "chunking";
    await p.fill("#cx-q", q);
    await p.waitForSelector(".cx-clusterhit .cx-famchip", { timeout: 8000 });

    const chip = p.locator(".cx-clusterhit .cx-famchip").first();
    const chipText = await chip.textContent();
    const chipHref = await chip.getAttribute("href");
    const slug = chipHref.replace(/^#e-/, "");

    const trial = [];
    for (const n of [1, 2, 3]) {
      if (n > 1) {
        // Go back to the search result state: retype the query.
        await p.fill("#cx-q", "");
        await p.fill("#cx-q", q);
        await p.waitForSelector(".cx-clusterhit .cx-famchip", { timeout: 8000 });
      }
      await p.locator(".cx-clusterhit .cx-famchip").first().click();
      await p.waitForTimeout(1400); // let smooth scroll settle
      const target = p.locator(`#e-${slug}`);
      const cnt = await target.count();
      const box = cnt ? await target.boundingBox() : null;
      const scrollY = await p.evaluate(() => window.scrollY);
      const hash = await p.evaluate(() => location.hash);
      const histLen = await p.evaluate(() => history.length);
      trial.push({
        click: n, targets: cnt, y: box ? Math.round(box.y) : null,
        inView: inView(box, h, w), scrollY: Math.round(scrollY), hash, histLen,
      });
    }
    results.push({ locale, w, chip: chipText, slug, trial, errs });
    await ctx.close();
  }
}
console.log(JSON.stringify(results, null, 2));
await b.close();
