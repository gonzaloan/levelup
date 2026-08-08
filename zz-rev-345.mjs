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

// ══════════════ 3. NEW DEFECTS FROM THE FIXES ══════════════
{
  const { ctx, p, errs } = await pg();
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });

  // 3a. CROSS-CLUSTER chip: search "agent", find a chip whose cluster != openCluster(chunking)
  await p.fill("#cx-q", "agent");
  await p.waitForSelector(".cx-clusterhit", { timeout: 8000 });
  const clusters = await p.locator(".cx-clusterhit .cx-cluster-title").allTextContents();
  R.crossClusterHits = clusters;
  // pick the LAST cluster hit's first chip -> definitely not chunking
  const lastSec = p.locator(".cx-clusterhit").last();
  const chip = lastSec.locator(".cx-famchip").first();
  const cSlug = (await chip.getAttribute("href")).replace(/^#e-/, "");
  await chip.scrollIntoViewIfNeeded();
  // record scroll samples to detect DOUBLE SCROLL / jump
  await p.evaluate(() => { window.__s = []; const id = setInterval(() => { window.__s.push([Math.round(performance.now()), Math.round(scrollY)]); if (window.__s.length > 60) clearInterval(id); }, 40); });
  await chip.click();
  await p.waitForTimeout(2000);
  R.crossCluster = { slug: cSlug, ...(await p.evaluate(ENTRY, cSlug)), samples: await p.evaluate(() => window.__s), errs: [...errs] };

  // 3b. RAPID double-click on the same chip (no re-search between)
  await p.fill("#cx-q", "");
  await p.fill("#cx-q", "chunking");
  await p.waitForSelector(".cx-clusterhit .cx-famchip");
  const c2 = p.locator(".cx-clusterhit .cx-famchip").first();
  const s2 = (await c2.getAttribute("href")).replace(/^#e-/, "");
  await c2.dblclick();   // two clicks in <50ms; second lands after mode switched (element gone)
  await p.waitForTimeout   (1800);
  R.rapidDblClick = { slug: s2, ...(await p.evaluate(ENTRY, s2)), errs: [...errs] };

  // 3c. TWO DIFFERENT chips in quick succession (different clusters)
  await p.fill("#cx-q", "");
  await p.fill("#cx-q", "agent");
  await p.waitForSelector(".cx-clusterhit .cx-famchip");
  const chipA = p.locator(".cx-clusterhit").first().locator(".cx-famchip").first();
  const chipB = p.locator(".cx-clusterhit").last().locator(".cx-famchip").first();
  const sA = (await chipA.getAttribute("href")).replace(/^#e-/, "");
  const sB = (await chipB.getAttribute("href")).replace(/^#e-/, "");
  await chipA.click();
  await p.waitForTimeout(60);
  // chipB is now gone (search closed) — so instead click a prereq chip on the landed entry, then Back
  R.twoChips = { first: sA, second: sB, afterFirst: await p.evaluate(ENTRY, sA) };
  await p.waitForTimeout(1500);
  R.twoChips.settled = await p.evaluate(ENTRY, sA);

  // 3d. BROWSE-mode chip ("anchor" path): does hashchange->goToEntry double-scroll?
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  await p.locator(".cx-cluster .cx-famchip").first().scrollIntoViewIfNeeded();
  const bChip = p.locator(".cx-cluster .cx-famchip").first();
  const bSlug = (await bChip.getAttribute("href")).replace(/^#e-/, "");
  await p.evaluate(() => { window.__s = []; const id = setInterval(() => { window.__s.push([Math.round(performance.now()), Math.round(scrollY)]); if (window.__s.length > 60) clearInterval(id); }, 40); });
  await bChip.click();
  await p.waitForTimeout(2000);
  const bs = await p.evaluate(() => window.__s);
  const ys = bs.map((x) => x[1]);
  // reversal detection: does the scroll go one way then back?
  let dirChanges = 0, prevDir = 0;
  for (let i = 1; i < ys.length; i++) { const d = Math.sign(ys[i] - ys[i - 1]); if (d && prevDir && d !== prevDir) dirChanges++; if (d) prevDir = d; }
  R.browseChip = { slug: bSlug, ...(await p.evaluate(ENTRY, bSlug)), dirChanges, yRange: [Math.min(...ys), Math.max(...ys)], hash: await p.evaluate(() => location.hash), errs: [...errs] };

  // 3e. BROWSER BACK after a chip click from search
  await p.goto(`${BASE}/en/`, { waitUntil: "networkidle" });
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  await p.fill("#cx-q", "chunking");
  await p.waitForSelector(".cx-clusterhit .cx-famchip");
  const histBefore = await p.evaluate(() => history.length);
  await p.locator(".cx-clusterhit .cx-famchip").first().click();
  await p.waitForTimeout(1400);
  const histAfter = await p.evaluate(() => history.length);
  const urlAfter = p.url();
  await p.goBack({ waitUntil: "networkidle" }).catch((e) => errs.push("goBack:" + e.message));
  await p.waitForTimeout(1400);
  R.back = {
    histBefore, histAfter, urlAfter, urlAfterBack: p.url(),
    onCodex: p.url().includes("/codex"),
    modeTabs: await p.locator('.cx-modes button[role="tab"]').count(),
    queryValue: await p.locator("#cx-q").inputValue().catch(() => "n/a"),
    errs: [...errs],
  };

  // 3f. Back after the OPEN-CLUSTER button (no hash written at all)
  await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
  await p.fill("#cx-q", "chunking");
  await p.waitForSelector(".cx-clusterhit .cx-openbtn");
  await p.locator(".cx-clusterhit .cx-openbtn").first().click();
  await p.waitForTimeout(1200);
  R.openBtnNoHash = { hash: await p.evaluate(() => location.hash), hist: await p.evaluate(() => history.length) };

  R.errs3 = errs;
  await ctx.close();
}

// ══════════════ 4. COLD EXTERNAL DEEP LINKS ══════════════
{
  const slugs = ["e-hnsw-index", "e-retrieval-vs-generation-eval", "e-prompt-injection", "e-late-chunking", "e-fixed-size-chunking"];
  R.deep = [];
  for (const locale of ["en", "es"]) {
    for (const [w, h] of [[1280, 900], [360, 740]]) {
      for (const frag of slugs) {
        const { ctx, p, errs } = await pg(w, h);
        await p.goto(`${BASE}/${locale}/codex/#${frag}`, { waitUntil: "networkidle" });
        await p.waitForTimeout(1600);
        const slug = frag.replace(/^e-/, "");
        R.deep.push({ locale, w, frag, ...(await p.evaluate(ENTRY, slug)), hash: await p.evaluate(() => location.hash), errs });
        await ctx.close();
      }
    }
  }
}

// ══════════════ 5. SEARCH BOUND ON SCREEN ══════════════
{
  R.search = [];
  const titles = {
    en: ["Chunking", "Embeddings", "Vector indexes", "Retrieval and ranking", "Evaluation", "Context engineering", "Agent patterns", "Tools and integration", "Serving and performance", "Security and guardrails", "Model strategy"],
    es: [],
  };
  for (const locale of ["en", "es"]) {
    const { ctx, p, errs } = await pg();
    await p.goto(`${BASE}/${locale}/codex/`, { waitUntil: "networkidle" });
    // read the 11 real titles from the sidebar so ES is exact
    const real = await p.locator(".ws-sidebar .sb-domain .cx-sb-name").allTextContents();
    const queries = [...real.map((s) => s.trim()), "de", "the", "and", "modelo", "model", "agente", "chunking", "prompt injection", "y", "se", "con", "to"];
    for (const q of queries) {
      await p.fill("#cx-q", "");
      await p.fill("#cx-q", q);
      await p.waitForTimeout(320);
      const rec = await p.evaluate(() => {
        const res = document.querySelector(".cx-results");
        const noHits = !!res && /Nothing matches|Todav/i.test(res.textContent) && !document.querySelector(".cx-hit") && !document.querySelector(".cx-clusterhit");
        return {
          clusterHits: document.querySelectorAll(".cx-clusterhit").length,
          clusterTitles: [...document.querySelectorAll(".cx-clusterhit .cx-cluster-title")].map((e) => e.textContent.trim()),
          entryHits: document.querySelectorAll(".cx-hit").length,
          noHitsState: noHits,
          eyebrows: [...(res?.querySelectorAll(":scope > .eyebrow, :scope .cx-clusterhits > .eyebrow") ?? [])].map((e) => e.textContent.trim()),
          resultsRendered: !!res,
        };
      });
      R.search.push({ locale, q, ...rec });
    }
    R["errs5_" + locale] = errs;
    await ctx.close();
  }
}

console.log(JSON.stringify(R, null, 2));
await b.close();
