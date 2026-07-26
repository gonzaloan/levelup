import { chromium } from '@playwright/test';
const b = await chromium.launch();
const errs = [];
for (const [name, url, checks] of [
  ['levelup', 'https://levelup.skillrealm.dev/en/today/', ['.streak', '.today-card']],
  ['hub',     'https://skillrealm.dev/',                  ['.product']],
  ['personal','https://gonzalo-munoz.com/',               ['#products', '.productGrid']],
]) {
  const ctx = await b.newContext({ viewport:{width:1440,height:1000}, reducedMotion:'reduce' });
  const p = await ctx.newPage();
  const e = []; p.on('console',m=>{if(m.type()==='error')e.push(m.text())}); p.on('pageerror',x=>e.push('PAGEERROR '+x.message));
  await p.goto(url, {waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  const found = {};
  for (const sel of checks) found[sel] = await p.locator(sel).count();
  const ov = await p.evaluate(()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth}));
  console.log(name.padEnd(9), JSON.stringify(found), 'overflow:', ov.sw>ov.cw+2 ? 'YES' : 'no', '| errors:', e.length||0);
  if (e.length) errs.push(name+': '+e.slice(0,2).join(' | '));
  await p.screenshot({path:`research/audit-2026-07-25/live-${name}.png`});
  await ctx.close();
}
console.log(errs.length ? 'CONSOLE ERRORS:\n'+errs.join('\n') : 'no console errors anywhere');
await b.close();
