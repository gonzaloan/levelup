#!/usr/bin/env node
/* Post-deploy verification for the Codex + the rewritten lessons, against the LIVE
   site. A 200 proves none of this: browse/path/search are client state, the cluster
   picker only exists below 1051px, the deep-link fix depends on a hash effect, and
   the lesson pane's structure renders below a fold.

   Every check here corresponds to a defect the review gate actually found, so this
   is a regression suite rather than a smoke test:
     • entry anatomy visible without interaction  (the module's editorial position)
     • no cluster clips its content on a phone    (18 cards inherited a 395px track)
     • search folds diacritics                    (half the content is Spanish)
     • the path descends to layer 0               (its own copy says "read bottom to top")
     • a deep link opens the RIGHT cluster        (80 of 92 links used to land wrong)
     • the ES pane renders structure and a real question, with the figure above the fold

   Known and expected: /hero/codex.webp 404s until the art is generated on a machine
   with Stable Diffusion. PageHeroArt renders nothing when it is absent, which is why
   the page is complete without it.

   Usage: node tools/verify-codex-live.mjs            # exits 1 on any failure
*/
import { chromium } from '@playwright/test';
const B = 'https://levelup.skillrealm.dev';
const b = await chromium.launch();
const errs = [];
let fails = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ' :: ' + detail : ''}`);
  if (!ok) fails++;
};

for (const [w, tag] of [[390, 'phone'], [1280, 'desktop']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${tag} PAGEERROR ${e.message}`));
  p.on('response', (r) => { if (r.status() === 404) errs.push(`${tag} 404 ${r.url()}`); });

  // ── The Codex renders and its entries carry their anatomy ──
  await p.goto(`${B}/en/codex/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const cx = await p.evaluate(() => ({
    entries: document.querySelectorAll('.cx-entry').length,
    def: !!document.querySelector('.cx-entry .cx-def')?.textContent?.trim(),
    cost: !!document.querySelector('.cx-entry .cx-pair-cost dd')?.textContent?.trim(),
    cheaper: !!document.querySelector('.cx-entry .cx-cheaper')?.textContent?.trim(),
    stats: document.querySelector('.res-stats')?.textContent?.trim(),
  }));
  check(cx.entries > 0, `${tag} codex renders entries`, `${cx.entries} cards`);
  check(cx.def && cx.cost && cx.cheaper, `${tag} entry anatomy visible without interaction`);
  check(/107 entries/.test(cx.stats ?? ''), `${tag} entry count`, cx.stats);

  // ── Nothing clipped, across EVERY cluster ──
  const clusters = await p.locator('.cx-clusterpick select option').count();
  if (w === 390) {
    check(clusters > 10, 'phone cluster picker offers every cluster', `${clusters} options`);
    let clipped = [];
    for (let i = 0; i < clusters; i++) {
      await p.locator('.cx-clusterpick select').selectOption({ index: i });
      await p.waitForTimeout(150);
      const bad = await p.evaluate(() => {
        const vw = window.innerWidth;
        const scope = document.querySelector('.cx');
        const name = document.querySelector('.cx-cluster-title')?.textContent ?? '?';
        const past = [...scope.querySelectorAll('*')]
          .filter((el) => !el.closest('.sky'))
          .filter((el) => el.getBoundingClientRect().right > vw + 2).length;
        return past ? name : null;
      });
      if (bad) clipped.push(bad);
    }
    check(clipped.length === 0, 'phone: no cluster clips its content', clipped.join(', '));
  }

  // ── Diacritic-folded search ──
  await p.goto(`${B}/en/codex/`, { waitUntil: 'networkidle' });
  await p.locator('#cx-q').fill('evaluacion');
  await p.waitForTimeout(400);
  const unaccented = await p.locator('.cx-hit').count();
  await p.locator('#cx-q').fill('evaluación');
  await p.waitForTimeout(400);
  const accented = await p.locator('.cx-hit').count();
  check(unaccented > 0 && unaccented === accented, `${tag} search folds diacritics`, `${unaccented} vs ${accented}`);

  // ── The reading path reads bottom-up ──
  await p.goto(`${B}/en/codex/`, { waitUntil: 'networkidle' });
  await p.getByRole('tab', { name: /reading path/i }).click();
  await p.waitForTimeout(400);
  const depths = await p.locator('.cx-band').evaluateAll((els) => els.map((e) => Number(e.dataset.depth)));
  check(depths.length > 1 && depths[depths.length - 1] === 0, `${tag} path descends to layer 0`, depths.join('>'));

  // ── A deep link lands on its named entry (the round-1 blocker) ──
  await p.goto(`${B}/en/codex/#e-continuous-batching`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const deep = await p.evaluate(() => {
    const el = document.getElementById('e-continuous-batching');
    if (!el) return { ok: false, why: 'entry not in the DOM' };
    const r = el.getBoundingClientRect();
    return { ok: r.height > 0, cluster: document.querySelector('.cx-cluster-title')?.textContent };
  });
  check(deep.ok && /serving/i.test(deep.cluster ?? ''), `${tag} deep link opens the right cluster`, deep.cluster);

  // ── A rewritten lesson shows structure, not a wall ──
  //
  // The structure lives in the LABELLED SECTIONS, which the pane renders below the
  // figure — so the check has to open the fold first. Measuring the arrival state
  // alone reported "0 bold, 0 bullets" on a concept that has twelve of each, which
  // is a defect in the check, not in the page.
  await p.goto(`${B}/es/lesson/technical-depth-l3/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.getByRole('button', { name: /→/ }).first().click();
  await p.waitForTimeout(600);
  const arrival = await p.evaluate(() => ({
    why: document.querySelector('.cp-why')?.textContent?.trim() ?? '',
    def: document.querySelector('.cp-def')?.textContent?.trim().slice(0, 70) ?? '',
    figureY: Math.round(document.querySelector('.cp-figure')?.getBoundingClientRect().top ?? -1),
  }));
  // The question mark can sit anywhere in the sentence, and Spanish opens with ¿.
  check(/[?¿]/.test(arrival.why), `${tag} ES why is a question`, arrival.why.slice(0, 70));
  check(arrival.def.length > 20, `${tag} ES definition leads the pane`, arrival.def);
  if (w === 390) check(arrival.figureY > 0 && arrival.figureY < 700, 'phone: figure above the fold', `y=${arrival.figureY}`);

  const more = p.locator('.cp-more button').first();
  if (await more.count()) { await more.click(); await p.waitForTimeout(400); }
  const es = await p.evaluate(() => ({
    bold: document.querySelectorAll('.lesson-content strong').length,
    bullets: document.querySelectorAll('.lesson-content .cp-list li').length,
    labels: document.querySelectorAll('.lesson-content .cp-sublabel').length,
  }));
  check(es.bold > 0 && es.bullets > 0 && es.labels > 0,
    `${tag} ES lesson renders structure`, `${es.bold} bold, ${es.bullets} bullets, ${es.labels} labels`);

  await ctx.close();
}

await b.close();
console.log('');
if (errs.length) { console.log(`console/page errors (${errs.length}):`); for (const e of errs.slice(0, 8)) console.log('  ' + e); }
else console.log('no console or page errors');
console.log(fails ? `\n✗ ${fails} live check(s) FAILED` : '\n✓ all live checks passed');
process.exit(fails ? 1 : 0);
