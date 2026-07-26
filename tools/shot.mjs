import { chromium } from '@playwright/test';
const [,, ...routes] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:1000}, reducedMotion:'reduce' });
const p = await ctx.newPage();
const errs=[];
p.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
p.on('pageerror', e=>errs.push('PAGEERROR '+e.message));
for (const spec of routes) {
  const [name, route, ...acts] = spec.split('|');
  await p.goto('http://localhost:4180'+route, {waitUntil:'networkidle'});
  await p.waitForTimeout(500);
  for (const a of acts) {
    const el = p.getByRole('button', {name: new RegExp(a,'i')}).first();
    if (await el.count()) { await el.click(); await p.waitForTimeout(700); }
  }
  await p.screenshot({path:`research/audit-2026-07-25/${name}.png`, fullPage:true});
  console.log(name, 'ok');
}
console.log('ERRORS:', errs.length? errs.slice(0,4).join(' | ') : 'none');
await b.close();
