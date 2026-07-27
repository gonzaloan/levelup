import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})).newPage();
await p.goto('http://localhost:4180/en/lesson/systems-architecture-l7/',{waitUntil:'networkidle'});
await p.waitForTimeout(600);
await p.getByRole('button',{name:/→/}).first().click();
await p.waitForTimeout(400);
const cv = p.locator('.cv[data-prose]').first();
const rev = cv.locator('.cv-reveal');
if (await rev.count() && (await rev.getAttribute('aria-expanded'))==='false') await rev.click();
await p.waitForTimeout(300);
console.log(await p.evaluate(()=>{
  const cv=document.querySelector('.cv[data-prose]');
  const txt=cv.querySelector('.cv-body').innerText;
  const lines=txt.split('\n').map(l=>l.trim()).filter(Boolean);
  // A fragment: a line that begins lowercase and doesn't start with a marker.
  const frags=lines.filter(l=>/^[a-z]/.test(l)&&!/^[-*+\d|]/.test(l));
  return JSON.stringify({ totalLines: lines.length, fragments: frags.length, sample: frags.slice(0,3) },null,1);
}));
await p.screenshot({path:'research/audit-2026-07-25/prose-list.png'});
await b.close();
