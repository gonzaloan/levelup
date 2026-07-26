// Visual audit: capture key routes × both themes at desktop+mobile.
import { chromium } from 'playwright';
const BASE = 'http://localhost:4180';
const OUT = 'research/audit-2026-07-25';
const ROUTES = [
  ['landing', '/en/'],
  ['learn', '/en/learn/'],
  ['lesson', '/en/lesson/technical-depth-l5/'],
  ['assess', '/en/assess/'],
  ['me', '/en/me/'],
  ['build', '/en/build/'],
  ['gauntlet', '/en/gauntlet/'],
  ['ladder', '/en/ladder/'],
  ['tracks', '/en/tracks/'],
  ['practice', '/en/practice/'],
  ['map', '/en/map/'],
  ['method', '/en/method/'],
];
const issues = [];
const browser = await chromium.launch();
for (const theme of ['studio', 'pixel']) {
  for (const [vp, size] of [['desktop', {width:1440,height:900}], ['mobile', {width:390,height:844}]]) {
    const ctx = await browser.newContext({ viewport: size, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    for (const [name, route] of ROUTES) {
      errs.length = 0;
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      if (theme === 'pixel') {
        await page.evaluate(() => { localStorage.setItem('levelup.theme','pixel'); document.documentElement.setAttribute('data-theme','pixel'); });
        await page.waitForTimeout(400);
      }
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${theme}-${vp}-${name}.png`, fullPage: vp === 'desktop' });
      // overflow check
      const ov = await page.evaluate(() => {
        const de = document.documentElement;
        return { sw: de.scrollWidth, cw: de.clientWidth };
      });
      if (ov.sw > ov.cw + 2) issues.push(`OVERFLOW ${theme}/${vp}/${name}: ${ov.sw} > ${ov.cw}`);
      if (errs.length) issues.push(`CONSOLE ${theme}/${vp}/${name}: ${errs.slice(0,3).join(' | ')}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(issues.length ? issues.join('\n') : 'NO ISSUES');
