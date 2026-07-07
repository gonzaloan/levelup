import { test, expect, type Page } from "@playwright/test";

// Full-surface visual audit: capture every key screen in both themes, and
// programmatically flag horizontal overflow (the #1 overlap smell). Screenshots
// land in test-results/audit-* for human + reviewer inspection.

const SCREENS: { path: string; name: string; settle?: number }[] = [
  { path: "/en/", name: "landing" },
  { path: "/en/path/", name: "path" },
  { path: "/en/lesson/technical-depth-l5/", name: "lesson-overview" },
  { path: "/en/checkpoint/chk-technical-depth-l5/", name: "checkpoint" },
  { path: "/en/map/", name: "map" },
  { path: "/en/me/", name: "me" },
  { path: "/en/ladder/", name: "ladder" },
  { path: "/en/tracks/", name: "tracks" },
  { path: "/en/gauntlet/", name: "gauntlet" },
  { path: "/en/assess/", name: "assess" },
];

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

for (const theme of ["studio", "pixel"] as const) {
  for (const vp of [{ w: 1280, h: 900, tag: "desktop" }, { w: 390, h: 844, tag: "mobile" }]) {
    test(`audit ${theme} ${vp.tag}`, async ({ page }) => {
      await page.addInitScript((t) => { if (t === "pixel") window.localStorage.setItem("levelup.theme", "pixel"); }, theme);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      const offenders: string[] = [];
      for (const s of SCREENS) {
        await page.goto(s.path).catch(() => {});
        await page.waitForTimeout(s.settle ?? 900);
        const o = await overflow(page);
        if (o > 1) offenders.push(`${s.name}(+${o}px)`);
        await page.screenshot({ path: `test-results/audit-${theme}-${vp.tag}-${s.name}.png`, fullPage: true }).catch(() => {});
      }
      // Report overflow offenders but don't hard-fail the capture run (audit is informational).
      if (offenders.length) console.log(`OVERFLOW ${theme}/${vp.tag}: ${offenders.join(", ")}`);
      expect(offenders, `horizontal overflow on: ${offenders.join(", ")}`).toEqual([]);
    });
  }
}
