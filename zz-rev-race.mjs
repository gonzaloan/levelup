import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:4180";
const b = await chromium.launch();
const ENTRY = (slug) => {
  const t = document.getElementById("e-" + slug);
  if (!t) return { targets: 0 };
  const r = t.getBoundingClientRect();
  return { targets: 1, top: Math.round(r.top), inVp: r.top >= -1 && r.top < innerHeight, y: Math.round(scrollY) };
};

const SLUGS = ["indirect-prompt-injection", "hnsw-index", "owasp-llm-top-10", "prompt-caching", "late-chunking"];
const N = 12;
const tally = {};
const failures = [];

for (const slug of SLUGS) {
  tally[slug] = { ok: 0, fail: 0 };
  for (let i = 0; i < N; i++) {
    const ctx = await b.newContext();
    const p = await ctx.newPage();
    await p.setViewportSize({ width: 1280, height: 900 });
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e)));
    // instrument scrollIntoView BEFORE the app runs
    await p.addInitScript(() => {
      window.__siv = [];
      const orig = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function (...a) {
        window.__siv.push({ t: Math.round(performance.now()), id: this.id, cls: String(this.className).slice(0, 30), y: Math.round(scrollY) });
        return orig.apply(this, a);
      };
      window.__rafMiss = [];
    });
    await p.goto(`${BASE}/en/codex/#e-${slug}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1600);
    const m = await p.evaluate(ENTRY, slug);
    const siv = await p.evaluate(() => window.__siv);
    const ok = m.targets === 1 && m.inVp;
    tally[slug][ok ? "ok" : "fail"]++;
    if (!ok) failures.push({ slug, i, m, siv, errs });
    await ctx.close();
  }
}
console.log(JSON.stringify({ N, tally, failures }, null, 2));
await b.close();
