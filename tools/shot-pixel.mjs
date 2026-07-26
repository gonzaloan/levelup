import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:1000}, reducedMotion:'reduce' });
const p = await ctx.newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
// set pixel theme before any navigation so the boot script picks it up
await p.goto('http://localhost:4180/en/');
await p.evaluate(()=>localStorage.setItem('levelup.theme','pixel'));
for (const [name, route] of [['px-learn','/en/learn/'],['px-cloud-lesson','/en/lesson/cloud-platform-l5/'],['px-checkpoint','/en/checkpoint/chk-cloud-platform-l5/']]) {
  await p.goto('http://localhost:4180'+route, {waitUntil:'networkidle'});
  await p.waitForTimeout(700);
  await p.screenshot({path:`research/audit-2026-07-25/${name}.png`, fullPage:false});
  console.log(name,'ok');
}
console.log('ERRORS:', errs.length? errs.slice(0,4).join(' | '):'none');
await b.close();
