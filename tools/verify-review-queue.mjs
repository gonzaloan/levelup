import { chromium } from '@playwright/test';
// Reproduces reviewer 3's blocker B1: seed 3 due reviews and confirm all 3 are
// served, the "of N" total stays constant, and every schedule advances.
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1280,height:900}, reducedMotion:'reduce' });
const p = await ctx.newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));

await p.goto('http://localhost:4182/en/');

// Seed directly: 3 concepts with a past due date, plus mark them read so the
// brief has no fresh concept competing for the flow.
const allSlugs = JSON.parse(process.env.ALL_SLUGS);
await p.evaluate((all) => {
  const KEY='levelup.v1';
  const picks=['big-o-as-tradeoff','data-structure-selection','memory-model-basics'];
  const reviews={}; for(const s of picks) reviews[s]={due:'2026-01-01',step:1,ease:2,reps:1,lapses:0,last:'2025-12-01'};
  // Everything read → no fresh concept → the brief is reviews-only, which is the
  // scenario under test (the queue shrinking under a live index).
  localStorage.setItem(KEY, JSON.stringify({
    responseLog:[],mastered:[],moduleScores:{},fieldWork:{},roomsCleared:[],gauntlets:{},
    conceptsRead:all,checkpointsCleared:[],checkpointScores:{},signal:0,
    cadence:{enabled:false,weeks:[]},reviews,streak:{days:[]},dailyLog:{},skipped:[]
  }));
}, allSlugs);
await p.goto('http://localhost:4182/en/today/', {waitUntil:'networkidle'});
await p.waitForTimeout(600);
// Reviews-only day: the brief offers "Start N review(s)" instead of "Begin".
const enter = p.getByRole('button', {name:/Start \d+ review|Begin today/i}).first();
if (await enter.count()) { await enter.click(); await p.waitForTimeout(700); }
console.log('reached review stage:', (await p.locator('.today-review').count()) > 0);

const seen=[]; const totals=[];
for (let i=0;i<4;i++){
  const eyebrow = await p.locator('.today-card .eyebrow').first().innerText().catch(()=>'');
  if(!/Review/i.test(eyebrow)) break;
  totals.push(eyebrow.trim());
  seen.push(await p.locator('.today-conceptTitle').first().innerText());
  await p.getByRole('button', {name:/Show the answer/i}).click();
  await p.waitForTimeout(250);
  await p.getByRole('button', {name:/^Solid$/}).click();
  await p.waitForTimeout(500);
}
const after = await p.evaluate(()=>{
  const p=JSON.parse(localStorage.getItem('levelup.v1'));
  return {log:p.dailyLog, dues:Object.fromEntries(Object.entries(p.reviews).map(([k,v])=>[k,v.due]))};
});
console.log('reviews served:', seen.length, JSON.stringify(seen));
console.log('totals shown  :', JSON.stringify(totals));
console.log('reviewsDone   :', Object.values(after.log)[0]?.reviewsDone);
console.log('all rescheduled to a future date:', Object.values(after.dues).every(d=>d>'2026-07-25'), JSON.stringify(after.dues));
console.log('done card:', await p.locator('.today-done').count() > 0);
console.log('ERRORS:', errs.length? errs.slice(0,3).join(' | '):'none');
await b.close();
