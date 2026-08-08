import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:4180";
const b = await chromium.launch();
const WIDTHS = [[1280, 900], [768, 900], [360, 740]];
const out = [];

async function newPage(w, h) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.setViewportSize({ width: w, height: h });
  const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror:" + String(e)));
  p.on("console", (m) => { if (m.type() === "error") errs.push("console:" + m.text()); });
  return { ctx, p, errs, vp: await p.evaluate(() => [innerWidth, innerHeight]) };
}

const HEAD_METRIC = () => {
  const head = document.querySelector(".cx-cluster .cx-cluster-title");
  if (!head) return { err: "no-heading" };
  const hr = head.getBoundingClientRect();
  const hdr = document.querySelector("header");
  const cs = hdr && getComputedStyle(hdr);
  const hrect = hdr && hdr.getBoundingClientRect();
  const navH = hdr && (cs.position === "sticky" || cs.position === "fixed") && hrect.top <= 1 ? hrect.height : 0;
  const visTop = Math.max(hr.top, navH);
  const visH = Math.max(0, Math.min(hr.bottom, innerHeight) - visTop);
  return {
    text: head.textContent.trim(), navH: Math.round(navH),
    top: Math.round(hr.top), bottom: Math.round(hr.bottom), h: Math.round(hr.height),
    inViewport: hr.top >= -1 && hr.top < innerHeight,
    visibleFrac: +(visH / hr.height).toFixed(2),
    hiddenByNavPx: Math.round(Math.max(0, Math.min(hr.bottom, navH) - hr.top)),
    smt: getComputedStyle(head).scrollMarginTop,
    scrollY: Math.round(scrollY),
  };
};

const ENTRY_METRIC = (slug) => {
  const t = document.getElementById("e-" + slug);
  if (!t) return { err: "no-target", targets: 0 };
  const r = t.getBoundingClientRect();
  const hdr = document.querySelector("header");
  const navH = hdr ? hdr.getBoundingClientRect().height : 0;
  const term = t.querySelector(".cx-term, h3, h2, .cx-entry-term");
  const tr = term && term.getBoundingClientRect();
  return {
    top: Math.round(r.top), navH: Math.round(navH),
    inViewport: r.top >= -1 && r.top < innerHeight,
    underNav: r.top < navH, smt: getComputedStyle(t).scrollMarginTop,
    termTop: tr ? Math.round(tr.top) : null,
    termUnderNav: tr ? tr.top < navH : null,
    scrollY: Math.round(scrollY),
  };
};

for (const locale of ["en", "es"]) {
  for (const [w, h] of WIDTHS) {
    const { ctx, p, errs, vp } = await newPage(w, h);
    const rec = { locale, w, h, vp, errs };

    // ═══ 1. DEFECT A: same chip clicked 3x
    await p.goto(`${BASE}/${locale}/codex/`, { waitUntil: "networkidle" });
    await p.fill("#cx-q", "chunking");
    await p.waitForSelector(".cx-clusterhit .cx-famchip", { timeout: 8000 });
    const slug = (await p.locator(".cx-clusterhit .cx-famchip").first().getAttribute("href")).replace(/^#e-/, "");
    rec.chipSlug = slug;
    rec.defectA = [];
    for (let n = 1; n <= 3; n++) {
      if (n > 1) {
        await p.fill("#cx-q", "");
        await p.fill("#cx-q", "chunking");
        await p.waitForSelector(".cx-clusterhit .cx-famchip", { timeout: 8000 });
      }
      await p.locator(".cx-clusterhit .cx-famchip").first().click();
      await p.waitForTimeout(1400);
      rec.defectA.push({ click: n, ...(await p.evaluate(ENTRY_METRIC, slug)), hash: await p.evaluate(() => location.hash), hist: await p.evaluate(() => history.length) });
    }

    // ═══ 2a. DEFECT B: Open this cluster
    await p.goto(`${BASE}/${locale}/codex/`, { waitUntil: "networkidle" });
    await p.fill("#cx-q", "chunking");
    await p.waitForSelector(".cx-clusterhit .cx-openbtn", { timeout: 8000 });
    const btn = p.locator(".cx-clusterhit .cx-openbtn").first();
    await btn.scrollIntoViewIfNeeded();
    rec.openBtnBeforeY = Math.round(await p.evaluate(() => scrollY));
    await btn.click();
    await p.waitForTimeout(1500);
    rec.openBtn = await p.evaluate(HEAD_METRIC);
    if (locale === "en") await p.screenshot({ path: `C:/Projects/Personal/level-up/zz-s-openbtn-${w}.png` });

    // ═══ 2b. DEFECT B: path glossary term
    await p.goto(`${BASE}/${locale}/codex/`, { waitUntil: "networkidle" });
    await p.locator('.cx-modes button[role="tab"]').nth(1).click();
    await p.waitForSelector("details.cx-path-families", { timeout: 8000 });
    await p.locator("details.cx-path-families > summary").click();
    await p.waitForTimeout(200);
    const term = p.locator(".cx-path-defterm").nth(6);
    rec.pathWanted = (await term.textContent()).trim();
    await term.scrollIntoViewIfNeeded();
    rec.pathBeforeY = Math.round(await p.evaluate(() => scrollY));
    await term.click();
    await p.waitForTimeout(1500);
    rec.pathTerm = await p.evaluate(HEAD_METRIC);
    rec.pathTermMatches = rec.pathTerm.text === rec.pathWanted;
    if (locale === "en") await p.screenshot({ path: `C:/Projects/Personal/level-up/zz-s-pathterm-${w}.png` });

    out.push(rec);
    await ctx.close();
  }
}
console.log(JSON.stringify(out, null, 2));
await b.close();
