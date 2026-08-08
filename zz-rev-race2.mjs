import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:4180";
const b = await chromium.launch();
const ENTRY = (slug) => {
  const t = document.getElementById("e-" + slug);
  if (!t) return { targets: 0 };
  const r = t.getBoundingClientRect();
  return { targets: 1, top: Math.round(r.top), inVp: r.top >= -1 && r.top < innerHeight, y: Math.round(scrollY) };
};
const out = { runs: [], tally: {} };

for (const rate of [1, 4, 8, 20]) {
  const key = "cpu" + rate + "x";
  out.tally[key] = { ok: 0, fail: 0 };
  for (const slug of ["indirect-prompt-injection", "owasp-llm-top-10", "hnsw-index"]) {
    for (let i = 0; i < 5; i++) {
      const ctx = await b.newContext();
      const p = await ctx.newPage();
      await p.setViewportSize({ width: 1280, height: 900 });
      await p.addInitScript(() => {
        window.__siv = [];
        const orig = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function (...a) {
          window.__siv.push({ t: Math.round(performance.now()), id: this.id, y: Math.round(scrollY) });
          return orig.apply(this, a);
        };
      });
      const cdp = await ctx.newCDPSession(p);
      if (rate > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      await p.goto(`${BASE}/en/codex/#e-${slug}`, { waitUntil: "load" }).catch(() => {});
      await p.waitForTimeout(rate > 8 ? 8000 : 4000);
      const m = await p.evaluate(ENTRY, slug).catch((e) => ({ err: e.message }));
      const siv = await p.evaluate(() => window.__siv).catch(() => null);
      const ok = m.targets === 1 && m.inVp;
      out.tally[key][ok ? "ok" : "fail"]++;
      if (!ok) out.runs.push({ rate, slug, i, m, siv });
      await ctx.close();
    }
  }
}

// ALSO: the CLICK path under CPU throttling (chip + openBtn)
out.clickThrottle = [];
for (const rate of [1, 6, 20]) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 1280, height: 900 });
  const cdp = await ctx.newCDPSession(p);
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  if (rate > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  for (let i = 0; i < 4; i++) {
    await p.fill("#cx-q", "");
    await p.fill("#cx-q", "chunking");
    await p.waitForSelector(".cx-clusterhit .cx-famchip", { timeout: 20000 });
    await p.locator(".cx-clusterhit .cx-famchip").first().click();
    await p.waitForTimeout(rate > 8 ? 5000 : 2000);
    out.clickThrottle.push({ rate, i, kind: "chip", ...(await p.evaluate(ENTRY, "fixed-size-chunking")) });
  }
  // openBtn
  for (let i = 0; i < 3; i++) {
    await p.fill("#cx-q", "");
    await p.fill("#cx-q", "chunking");
    await p.waitForSelector(".cx-clusterhit .cx-openbtn", { timeout: 20000 });
    await p.locator(".cx-clusterhit .cx-openbtn").first().scrollIntoViewIfNeeded();
    await p.locator(".cx-clusterhit .cx-openbtn").first().click();
    await p.waitForTimeout(rate > 8 ? 5000 : 2000);
    out.clickThrottle.push({
      rate, i, kind: "openBtn", ...(await p.evaluate(() => {
        const e = document.querySelector(".cx-cluster .cx-cluster-title");
        const r = e.getBoundingClientRect();
        return { top: Math.round(r.top), inVp: r.top >= -1 && r.top < innerHeight, y: Math.round(scrollY) };
      })),
    });
  }
  await ctx.close();
}
console.log(JSON.stringify(out, null, 2));
await b.close();
