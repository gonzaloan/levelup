import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:4180";
const b = await chromium.launch();
const out = [];

for (const [w, h] of [[1280, 900], [768, 900], [360, 740]]) {
  const ctx = await b.newContext({ viewportSize: { width: w, height: h } });
  const p = await ctx.newPage();
  const rec = { w, h };
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });

  // What is sticky / fixed at the top, and how tall?
  rec.sticky = await p.evaluate(() => {
    const found = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position === "sticky" || cs.position === "fixed") {
        const r = el.getBoundingClientRect();
        if (r.top <= 5 && r.height > 20 && r.width > 100) {
          found.push({ tag: el.tagName, cls: el.className?.toString?.().slice(0, 60), h: Math.round(r.height), top: Math.round(r.top), z: cs.zIndex, pos: cs.position });
        }
      }
    }
    return found;
  });
  rec.entryScrollMargin = await p.evaluate(() => {
    const e = document.querySelector(".cx-entry");
    return e ? getComputedStyle(e).scrollMarginTop : null;
  });

  // Now do the openBtn flow and capture the full timeline
  await p.fill("#cx-q", "chunking");
  await p.waitForSelector(".cx-clusterhit .cx-openbtn");
  const btn = p.locator(".cx-clusterhit .cx-openbtn").first();
  await btn.scrollIntoViewIfNeeded();
  rec.beforeY = Math.round(await p.evaluate(() => window.scrollY));
  rec.docHeightBefore = await p.evaluate(() => document.documentElement.scrollHeight);

  // instrument: sample scrollY every 100ms for 2s after the click
  await p.evaluate(() => {
    window.__samples = [];
    const t0 = performance.now();
    const id = setInterval(() => {
      const el = document.querySelector(".cx-cluster .cx-cluster-title");
      window.__samples.push({
        t: Math.round(performance.now() - t0),
        y: Math.round(window.scrollY),
        headY: el ? Math.round(el.getBoundingClientRect().top) : null,
        docH: document.documentElement.scrollHeight,
      });
      if (performance.now() - t0 > 2200) clearInterval(id);
    }, 100);
  });
  await btn.click();
  await p.waitForTimeout(2600);
  rec.samples = await p.evaluate(() => window.__samples);
  rec.afterY = Math.round(await p.evaluate(() => window.scrollY));
  rec.docHeightAfter = await p.evaluate(() => document.documentElement.scrollHeight);
  rec.maxScroll = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  rec.headScrollMargin = await p.evaluate(() => {
    const e = document.querySelector(".cx-cluster .cx-cluster-title");
    return e ? getComputedStyle(e).scrollMarginTop : null;
  });
  // Is the heading actually visible, i.e. not under the sticky nav?
  rec.occluded = await p.evaluate(() => {
    const e = document.querySelector(".cx-cluster .cx-cluster-title");
    if (!e) return "no-heading";
    const r = e.getBoundingClientRect();
    const cx = r.left + Math.min(r.width / 2, 40);
    const cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return {
      headTop: Math.round(r.top), headBottom: Math.round(r.bottom),
      hitTag: top?.tagName, hitCls: top?.className?.toString?.().slice(0, 70),
      isHeadingOrChild: !!top && (top === e || e.contains(top)),
    };
  });
  out.push(rec);
  await ctx.close();
}
console.log(JSON.stringify(out, null, 2));
await b.close();
