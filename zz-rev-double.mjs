import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:4180";
const b = await chromium.launch();
const R = {};

// Does goToEntry run TWICE for one click? Count scrollIntoView + count React commits.
{
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.addInitScript(() => {
    window.__log = [];
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...a) {
      window.__log.push({ k: "siv", t: +performance.now().toFixed(1), id: this.id, cls: String(this.className).slice(0, 26), y: Math.round(scrollY), behavior: a[0]?.behavior });
      return orig.apply(this, a);
    };
    const rs = History.prototype.replaceState;
    History.prototype.replaceState = function (...a) { window.__log.push({ k: "replaceState", t: +performance.now().toFixed(1), url: a[2] }); return rs.apply(this, a); };
    const ps = History.prototype.pushState;
    History.prototype.pushState = function (...a) { window.__log.push({ k: "pushState", t: +performance.now().toFixed(1), url: a[2] }); return ps.apply(this, a); };
    addEventListener("hashchange", (e) => window.__log.push({ k: "hashchange", t: +performance.now().toFixed(1), to: location.hash }), true);
  });

  // Scenario 1: search chip (direct call + replaceState)
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  await p.evaluate(() => { window.__log = []; });
  await p.fill("#cx-q", "chunking");
  await p.waitForSelector(".cx-clusterhit .cx-famchip");
  await p.locator(".cx-clusterhit .cx-famchip").first().click();
  await p.waitForTimeout(1600);
  R.searchChip = await p.evaluate(() => window.__log);

  // Scenario 2: browse chip (returns "anchor" -> native jump + hashchange -> goToEntry)
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  await p.evaluate(() => { window.__log = []; });
  const bc = p.locator(".cx-cluster .cx-famchip").nth(2);
  await bc.scrollIntoViewIfNeeded();
  await bc.click();
  await p.waitForTimeout(1600);
  R.browseChip = await p.evaluate(() => window.__log);

  // Scenario 3: browse chip to an entry in the SAME cluster clicked twice (no state change at all)
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  const bc2 = p.locator(".cx-cluster .cx-famchip").nth(1);
  const s2 = (await bc2.getAttribute("href")).replace(/^#e-/, "");
  await bc2.scrollIntoViewIfNeeded(); await bc2.click(); await p.waitForTimeout(1300);
  const first = await p.evaluate((s) => { const e = document.getElementById("e-" + s).getBoundingClientRect(); return { top: Math.round(e.top), y: Math.round(scrollY) }; }, s2);
  // scroll far away, then click the SAME browse chip again
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(400);
  await p.evaluate(() => { window.__log = []; });
  const bc3 = p.locator(`.cx-cluster .cx-famchip[href="#e-${s2}"]`).first();
  await bc3.scrollIntoViewIfNeeded();
  await bc3.click();
  await p.waitForTimeout(1600);
  R.browseSameTwice = {
    slug: s2, first,
    second: await p.evaluate((s) => { const e = document.getElementById("e-" + s).getBoundingClientRect(); return { top: Math.round(e.top), y: Math.round(scrollY), inVp: e.top >= -1 && e.top < innerHeight }; }, s2),
    log: await p.evaluate(() => window.__log),
  };

  // Scenario 4: a PREREQUISITE chip on an entry card, cross-cluster (the original 92-link case)
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  const prereq = p.locator(".cx-entry a[href^='#e-']").first();
  const pcount = await p.locator(".cx-entry a[href^='#e-']").count();
  R.prereqCount = pcount;
  if (pcount) {
    const ps = (await prereq.getAttribute("href")).replace(/^#e-/, "");
    await prereq.scrollIntoViewIfNeeded();
    await p.evaluate(() => { window.__log = []; });
    await prereq.click();
    await p.waitForTimeout(1600);
    R.prereqChip = {
      slug: ps,
      m: await p.evaluate((s) => { const t = document.getElementById("e-" + s); if (!t) return { targets: 0 }; const r = t.getBoundingClientRect(); return { targets: 1, top: Math.round(r.top), inVp: r.top >= -1 && r.top < innerHeight, y: Math.round(scrollY) }; }, ps),
      log: await p.evaluate(() => window.__log),
    };
  }

  // Scenario 5: hash-only navigation via JS (external hashchange) — must still land
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  await p.evaluate(() => { window.__log = []; location.hash = "#e-hnsw-index"; });
  await p.waitForTimeout(1600);
  R.jsHash = {
    m: await p.evaluate(() => { const t = document.getElementById("e-hnsw-index"); if (!t) return { targets: 0 }; const r = t.getBoundingClientRect(); return { targets: 1, top: Math.round(r.top), inVp: r.top >= -1 && r.top < innerHeight, y: Math.round(scrollY) }; }),
    log: await p.evaluate(() => window.__log),
  };

  // Scenario 6: setting the SAME hash again via JS (the original defect's mechanism)
  await p.evaluate(() => { scrollTo(0, 0); window.__log = []; });
  await p.waitForTimeout(400);
  await p.evaluate(() => { location.hash = "#e-hnsw-index"; });
  await p.waitForTimeout(1600);
  R.jsHashSame = {
    m: await p.evaluate(() => { const r = document.getElementById("e-hnsw-index").getBoundingClientRect(); return { top: Math.round(r.top), inVp: r.top >= -1 && r.top < innerHeight, y: Math.round(scrollY) }; }),
    log: await p.evaluate(() => window.__log),
  };
  await ctx.close();
}
console.log(JSON.stringify(R, null, 2));
await b.close();
