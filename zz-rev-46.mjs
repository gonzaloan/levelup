import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:4180";
const b = await chromium.launch();
const R = {};
async function pg(w = 1280, h = 900, opts = {}) {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  await p.setViewportSize({ width: w, height: h });
  const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror:" + String(e)));
  p.on("console", (m) => { if (m.type() === "error") errs.push("console:" + m.text()); });
  return { ctx, p, errs };
}
const ENTRY = (slug) => {
  const t = document.getElementById("e-" + slug);
  if (!t) return { targets: 0 };
  const r = t.getBoundingClientRect();
  const navH = document.querySelector("header").getBoundingClientRect().height;
  return { targets: 1, top: Math.round(r.top), inVp: r.top >= -1 && r.top < innerHeight, underNav: r.top < navH, y: Math.round(scrollY) };
};

// ══ 4. deep links: REAL slugs, one per cluster + edge cases ══
{
  const slugs = ["hnsw-index", "direct-prompt-injection", "indirect-prompt-injection", "late-chunking",
    "owasp-llm-top-10", "workflow-vs-agent", "retrieval-vs-generation-eval", "prompt-caching"];
  R.deep = [];
  for (const locale of ["en", "es"]) {
    for (const [w, h] of [[1280, 900], [768, 900], [360, 740]]) {
      for (const s of slugs) {
        const { ctx, p, errs } = await pg(w, h);
        await p.goto(`${BASE}/${locale}/codex/#e-${s}`, { waitUntil: "networkidle" });
        await p.waitForTimeout(1500);
        R.deep.push({ locale, w, s, ...(await p.evaluate(ENTRY, s)), errs });
        await ctx.close();
      }
    }
  }
  // edge: nonexistent slug, empty hash, encoded hash
  R.deepEdge = [];
  for (const frag of ["#e-does-not-exist", "#e-", "#", "#e-hnsw%2Dindex", "#nonsense"]) {
    const { ctx, p, errs } = await pg();
    await p.goto(`${BASE}/en/codex/${frag}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    R.deepEdge.push({
      frag, errs, y: Math.round(await p.evaluate(() => scrollY)),
      cluster: await p.locator(".cx-cluster .cx-cluster-title").textContent().catch(() => null),
      alive: await p.locator("#cx-q").count(),
    });
    await ctx.close();
  }
}

// ══ 3g. THE rAF RACE: does the element exist when rAF fires? ══
{
  const { ctx, p, errs } = await pg();
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  // Instrument: wrap scrollIntoView + record whether the selectors resolve at each rAF tick.
  await p.evaluate(() => {
    window.__siv = [];
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...a) {
      window.__siv.push({ t: Math.round(performance.now()), tag: this.tagName, id: this.id, cls: this.className?.toString?.().slice(0, 40), y: Math.round(scrollY) });
      return orig.apply(this, a);
    };
  });
  await p.fill("#cx-q", "chunking");
  await p.waitForSelector(".cx-clusterhit .cx-famchip");
  await p.locator(".cx-clusterhit .cx-famchip").first().click();
  await p.waitForTimeout(1600);
  R.sivChip = await p.evaluate(() => window.__siv);

  // same for openClusterAt
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  await p.evaluate(() => {
    window.__siv = [];
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...a) {
      window.__siv.push({ t: Math.round(performance.now()), tag: this.tagName, id: this.id, cls: this.className?.toString?.().slice(0, 40), y: Math.round(scrollY) });
      return orig.apply(this, a);
    };
  });
  await p.fill("#cx-q", "chunking");
  await p.waitForSelector(".cx-clusterhit .cx-openbtn");
  await p.locator(".cx-clusterhit .cx-openbtn").first().scrollIntoViewIfNeeded();
  const n0 = (await p.evaluate(() => window.__siv.length));
  await p.locator(".cx-clusterhit .cx-openbtn").first().click();
  await p.waitForTimeout(1600);
  R.sivOpen = (await p.evaluate(() => window.__siv)).slice(n0);
  R.errs3g = errs;
  await ctx.close();
}

// ══ 3h. REDUCED MOTION (instant scroll) — does the fix still land? ══
{
  for (const [w, h] of [[1280, 900], [360, 740]]) {
    const { ctx, p, errs } = await pg(w, h, { reducedMotion: "reduce" });
    await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
    await p.fill("#cx-q", "chunking");
    await p.waitForSelector(".cx-clusterhit .cx-famchip");
    await p.locator(".cx-clusterhit .cx-famchip").first().click();
    await p.waitForTimeout(500);
    const a = await p.evaluate(ENTRY, "fixed-size-chunking");
    // second click
    await p.fill("#cx-q", "");
    await p.fill("#cx-q", "chunking");
    await p.waitForSelector(".cx-clusterhit .cx-famchip");
    await p.locator(".cx-clusterhit .cx-famchip").first().click();
    await p.waitForTimeout(500);
    const a2 = await p.evaluate(ENTRY, "fixed-size-chunking");
    // openBtn
    await p.fill("#cx-q", "chunking");
    await p.waitForSelector(".cx-clusterhit .cx-openbtn");
    await p.locator(".cx-clusterhit .cx-openbtn").first().scrollIntoViewIfNeeded();
    await p.locator(".cx-clusterhit .cx-openbtn").first().click();
    await p.waitForTimeout(500);
    const ob = await p.evaluate(() => {
      const e = document.querySelector(".cx-cluster .cx-cluster-title");
      const r = e.getBoundingClientRect();
      const navH = document.querySelector("header").getBoundingClientRect().height;
      return { top: Math.round(r.top), inVp: r.top >= -1 && r.top < innerHeight, underNav: r.top < navH, hiddenPx: Math.round(Math.max(0, Math.min(r.bottom, navH) - r.top)) };
    });
    R["reduced_" + w] = { click1: a, click2: a2, openBtn: ob, errs };
    await ctx.close();
  }
}

// ══ 5b. how far down are the ENTRY hits when 8 primers render ("modelo") ══
{
  const { ctx, p } = await pg(1280, 900);
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  for (const q of ["modelo", "model", "agente", "chunking", "de"]) {
    await p.fill("#cx-q", "");
    await p.fill("#cx-q", q);
    await p.waitForTimeout(350);
    R["burial_" + q] = await p.evaluate(() => {
      const ch = document.querySelectorAll(".cx-clusterhit");
      const first = document.querySelector(".cx-hit");
      const doc = document.documentElement.scrollHeight;
      const eb = [...document.querySelectorAll(".cx-results .eyebrow")].map((e) => e.textContent.trim()).slice(0, 4);
      return {
        clusterHits: ch.length,
        clusterBlockPx: ch.length ? Math.round([...ch].reduce((a, e) => a + e.getBoundingClientRect().height, 0)) : 0,
        firstEntryHitOffsetY: first ? Math.round(first.getBoundingClientRect().top + scrollY) : null,
        docHeight: doc, viewportsToFirstEntry: first ? +((first.getBoundingClientRect().top + scrollY) / innerHeight).toFixed(1) : null,
        eyebrows: eb,
      };
    });
  }
  await ctx.close();
}
console.log(JSON.stringify(R, null, 2));
await b.close();
