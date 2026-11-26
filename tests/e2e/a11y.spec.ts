import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Automated accessibility on the key screens, in both themes: no serious or critical WCAG 2.x A/AA
// violation (contrast, names, roles, labels). Automated checks catch ~a third of issues; this is
// the floor, not the ceiling.
const PAGES = ["/es/", "/es/c/reranking/", "/es/practice/", "/es/practice/code/longest-run-without-repeats/", "/es/gym/", "/es/plan/", "/es/labs/loops/", "/es/pro/"];

for (const theme of ["dark", "light"] as const) {
  for (const path of PAGES) {
    test(`a11y ${theme} ${path}`, async ({ page }) => {
      await page.addInitScript((t) => { try { localStorage.setItem("fg.theme", t); } catch { /* ignore */ } }, theme);
      await page.goto(path);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await page.waitForLoadState("networkidle");
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }
}
