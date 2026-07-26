// Post-deploy check for the mobile nav fix: the hamburger must be inside the
// viewport and the menu must open, at the narrowest phone width worth supporting.
import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const w of [360, 390]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 800 }, reducedMotion: 'reduce' })).newPage();
  await p.goto('https://levelup.skillrealm.dev/en/', { waitUntil: 'networkidle' });
  const right = await p.evaluate(() => Math.round(document.querySelector('.nav-burger').getBoundingClientRect().right));
  await p.getByRole('button', { name: /Open menu/i }).first().click();
  await p.waitForTimeout(500);
  const links = await p.locator('#nav-sheet a').count();
  console.log(`w=${w}  burger right=${right} (must be <= ${w})  menu links=${links}`);
  await p.close();
}
await b.close();
