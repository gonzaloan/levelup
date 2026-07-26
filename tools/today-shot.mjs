import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900}, reducedMotion:'reduce' });
const p = await ctx.newPage();
const errs=[];
p.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
p.on('pageerror', e=>errs.push('PAGEERROR '+e.message));
await p.goto('http://localhost:4180/en/today/', {waitUntil:'networkidle'});
await p.waitForTimeout(900);
await p.screenshot({path:'research/audit-2026-07-25/today-brief.png', fullPage:true});
// walk the flow
const begin = p.getByRole('button', {name:/Begin today/i});
if (await begin.count()) { await begin.click(); await p.waitForTimeout(800);
  await p.screenshot({path:'research/audit-2026-07-25/today-learn.png', fullPage:true}); }
console.log('ERRORS:', errs.length? errs.slice(0,5).join(' | '):'none');
await b.close();
