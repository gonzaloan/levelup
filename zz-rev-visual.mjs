import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:4180";
const b = await chromium.launch();
const R = { overflow: [], contrast: [], shots: [] };

function srgb(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum([r, g, b]) { return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b); }

const AUDIT = () => {
  const res = { hOverflow: [], tooSmallTargets: [], lowContrast: [], clipped: [] };
  const docW = document.documentElement.clientWidth;
  // horizontal overflow of any codex element
  for (const el of document.querySelectorAll(".cx-clusterhit, .cx-openbtn, .cx-path-families, .cx-path-defterm, .cx-path-deflist, .cx-path-deflist dd, .cx-primer, .cx-famchip, .cx-cluster-title")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > docW + 1 || r.left < -1) res.hOverflow.push({ cls: String(el.className).slice(0, 40), left: Math.round(r.left), right: Math.round(r.right), docW });
    if (el.scrollWidth > el.clientWidth + 2) res.clipped.push({ cls: String(el.className).slice(0, 40), sw: el.scrollWidth, cw: el.clientWidth });
  }
  // touch targets on the NEW controls
  for (const el of document.querySelectorAll(".cx-openbtn, .cx-path-defterm, .cx-path-families > summary")) {
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    if (r.height < 40) res.tooSmallTargets.push({ cls: String(el.className).slice(0, 40), h: Math.round(r.height), w: Math.round(r.width), tag: el.tagName });
  }
  // computed colours of the new surfaces, for contrast maths outside
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    // walk up for an opaque background
    let bg = cs.backgroundColor, n = el;
    while (bg === "rgba(0, 0, 0, 0)" && n.parentElement) { n = n.parentElement; bg = getComputedStyle(n).backgroundColor; }
    return { sel, color: cs.color, bg, fs: cs.fontSize, borderColor: cs.borderColor };
  };
  res.colors = [".cx-openbtn", ".cx-path-families > summary", ".cx-path-defterm", ".cx-path-deflist dd", ".cx-clusterhit .cx-cluster-title", ".cx-clusterhit .cx-cluster-tagline"].map(pick).filter(Boolean);
  res.docScrollW = document.documentElement.scrollWidth;
  res.clientW = docW;
  res.bodyOverflowX = document.documentElement.scrollWidth > docW + 1;
  return res;
};

function parseRGB(s) { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(",").map(Number); return p.slice(0, 3); }
function ratio(fg, bg) { const a = lum(fg), b2 = lum(bg); const L = Math.max(a, b2), D = Math.min(a, b2); return +((L + 0.05) / (D + 0.05)).toFixed(2); }

for (const theme of ["default", "pixel"]) {
  for (const [w, h] of [[1280, 900], [768, 900], [360, 740]]) {
    for (const surface of ["searchCluster", "path"]) {
      const ctx = await b.newContext();
      const p = await ctx.newPage();
      await p.setViewportSize({ width: w, height: h });
      const errs = [];
      p.on("pageerror", (e) => errs.push(String(e)));
      p.on("console", (m) => { if (m.type() === "error") errs.push("console:" + m.text()); });
      await p.goto(`${BASE}/en/codex/`, { waitUntil: "networkidle" });
      if (theme === "pixel") { await p.evaluate(() => document.documentElement.setAttribute("data-theme", "pixel")); await p.waitForTimeout(400); }
      if (surface === "searchCluster") {
        await p.fill("#cx-q", "agent");
        await p.waitForSelector(".cx-clusterhit .cx-openbtn", { timeout: 8000 });
        await p.locator(".cx-clusterhit .cx-openbtn").first().scrollIntoViewIfNeeded();
      } else {
        await p.locator('.cx-modes button[role="tab"]').nth(1).click();
        await p.waitForSelector("details.cx-path-families");
        await p.locator("details.cx-path-families > summary").click();
        await p.waitForTimeout(250);
        await p.locator(".cx-path-defterm").nth(3).scrollIntoViewIfNeeded();
      }
      const a = await p.evaluate(AUDIT);
      const contrasts = a.colors.map((c) => {
        const fg = parseRGB(c.color), bg = parseRGB(c.bg);
        return { sel: c.sel, fs: c.fs, color: c.color, bg: c.bg, ratio: fg && bg ? ratio(fg, bg) : null };
      });
      R.overflow.push({ theme, w, surface, hOverflow: a.hOverflow, clipped: a.clipped, tooSmall: a.tooSmallTargets, bodyOverflowX: a.bodyOverflowX, docScrollW: a.docScrollW, clientW: a.clientW, errs });
      R.contrast.push({ theme, w, surface, contrasts });
      const name = `zz-v-${theme}-${w}-${surface}.png`;
      await p.screenshot({ path: `C:/Projects/Personal/level-up/${name}` });
      R.shots.push(name);
      await ctx.close();
    }
  }
}
console.log(JSON.stringify(R, null, 2));
await b.close();
