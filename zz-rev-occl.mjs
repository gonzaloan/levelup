import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:4180";
const b = await chromium.launch();
const out = [];

async function measure(p, h, label, rec) {
  const r = await p.evaluate(() => {
    const head = document.querySelector(".cx-cluster .cx-cluster-title");
    if (!head) return { err: "no heading" };
    const hr = head.getBoundingClientRect();
    const hdr = document.querySelector("header");
    const cs = hdr ? getComputedStyle(hdr) : null;
    const hrect = hdr ? hdr.getBoundingClientRect() : null;
    const navH = hdr && (cs.position === "sticky" || cs.position === "fixed") && hrect.top <= 1 ? hrect.height : 0;
    // fraction of the heading box that lies below the nav
    const visTop = Math.max(hr.top, navH);
    const visH = Math.max(0, Math.min(hr.bottom, window.innerHeight) - visTop);
    const el = document.elementFromPoint(hr.left + Math.min(hr.width / 2, 30), hr.top + hr.height / 2);
    return {
      navH: Math.round(navH),
      headTop: Math.round(hr.top), headBottom: Math.round(hr.bottom), headH: Math.round(hr.height),
      visibleFraction: +(visH / hr.height).toFixed(2),
      hitTest: el?.tagName + "." + (el?.className?.toString?.().slice(0, 40) ?? ""),
      occludedByNav: hr.top < navH,
      pxHidden: Math.round(Math.max(0, Math.min(hr.bottom, navH) - hr.top)),
      // what text IS the topmost readable thing right under the nav?
      firstUnderNav: (() => {
        const e = document.elementFromPoint(window.innerWidth / 2, navH + 6);
        return (e?.tagName ?? "") + " :: " + (e?.textContent ?? "").trim().slice(0, 70);
      })(),
    };
  });
  rec[label] = r;
}

for (const [w, h] of [[1280, 900], [768, 900], [360, 740]]) {
  const ctx = await b.newContext({ viewportSize: { width: w, height: h } });
  const p = await ctx.newPage();
  const rec = { w, h };

  // openClusterAt via search button
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  await p.fill("#cx-q", "chunking");
  await p.waitForSelector(".cx-clusterhit .cx-openbtn");
  const btn = p.locator(".cx-clusterhit .cx-openbtn").first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await p.waitForTimeout(1500);
  await measure(p, h, "afterOpenBtn", rec);
  await p.screenshot({ path: `C:/Projects/Personal/level-up/zz-shot-openbtn-${w}.png` });

  // openClusterAt via path glossary term
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  await p.locator('.cx-modes button[role="tab"]').nth(1).click();
  await p.waitForSelector("details.cx-path-families");
  await p.locator("details.cx-path-families > summary").click();
  await p.waitForTimeout(150);
  const term = p.locator(".cx-path-defterm").nth(6);
  await term.scrollIntoViewIfNeeded();
  await term.click();
  await p.waitForTimeout(1500);
  await measure(p, h, "afterPathTerm", rec);
  await p.screenshot({ path: `C:/Projects/Personal/level-up/zz-shot-pathterm-${w}.png` });

  // CONTROL: the goToEntry path (chip), which targets .cx-entry (scroll-margin 76px)
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  await p.fill("#cx-q", "chunking");
  await p.waitForSelector(".cx-clusterhit .cx-famchip");
  await p.locator(".cx-clusterhit .cx-famchip").first().click();
  await p.waitForTimeout(1500);
  rec.chipControl = await p.evaluate(() => {
    const el = document.querySelector(".cx-entry");
    const t = document.getElementById("e-fixed-size-chunking");
    const hdr = document.querySelector("header").getBoundingClientRect();
    const r = t.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + 30, r.top + 10);
    return { navH: Math.round(hdr.height), entryTop: Math.round(r.top), occluded: r.top < hdr.height, hit: hit?.tagName };
  });
  await p.screenshot({ path: `C:/Projects/Personal/level-up/zz-shot-chip-${w}.png` });

  out.push(rec);
  await ctx.close();
}
console.log(JSON.stringify(out, null, 2));
await b.close();
