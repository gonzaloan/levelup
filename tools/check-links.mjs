#!/usr/bin/env node
/* Link-liveness check for the resource library. Follows redirects (a 301 to a
   stable new home is fine — the promise is "this link works", not "this link
   never moved"). Reports the final status per URL.
   Usage: node tools/check-links.mjs <file.json> [file2.json ...] */
import { readFileSync } from "node:fs";
const files = process.argv.slice(2);
const all = files.flatMap((f) => JSON.parse(readFileSync(f, "utf8")).resources.map((r) => ({ ...r, __f: f })));
const results = [];
const CONC = 6;
let i = 0;
async function worker() {
  while (i < all.length) {
    const r = all[i++];
    let status = 0, finalUrl = r.url, err = "";
    try {
      // HEAD first (cheap); some CDNs reject HEAD, so fall back to a ranged GET.
      let resp = await fetch(r.url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(20000) });
      // Some hosts answer HEAD with 404/405/403 while serving the page fine on GET
      // (Kaggle does this). Retry any failure with a ranged GET before believing it.
      if (!resp.ok) {
        resp = await fetch(r.url, { method: "GET", redirect: "follow", headers: { Range: "bytes=0-2048" }, signal: AbortSignal.timeout(20000) });
      }
      status = resp.status; finalUrl = resp.url;
    } catch (e) { err = String(e.message || e).slice(0, 60); }
    results.push({ id: r.id, url: r.url, status, finalUrl, err, file: r.__f });
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
// A 200 is not enough. A redirect that drops the article slug and lands on a
// generic index means the content is GONE — the link "works" while delivering
// nothing the `why` promised. That's the failure mode this check exists to catch.
const lastSeg = (u) => {
  try { return new URL(u).pathname.replace(/\/+$/, "").split("/").pop() ?? ""; }
  catch { return ""; }
};
const isLanded = (r) => {
  const from = lastSeg(r.url), to = lastSeg(r.finalUrl);
  if (!from || from === to) return true;
  // A site that moves the topic into a query string is still on the article
  // (3blue1brown: /topics/neural-networks → /?topic=neural-networks).
  try {
    const q = new URL(r.finalUrl).search.toLowerCase();
    if (q.includes(from.toLowerCase())) return true;
  } catch { /* not a URL we can parse — fall through to the slug check */ }
  // A version alias resolving to a concrete version is the documented pattern for
  // "latest" spec URLs, not a lost article.
  if (from === "latest" && /^\d{4}-\d{2}-\d{2}$|^v?\d/.test(to)) return true;
  // Tolerate a redirect whose final segment still contains most of the original
  // slug (title tweaks, e.g. "reliability-and-constant-work" → "…-and-a-good-cup-of-coffee").
  const words = from.split("-").filter((w) => w.length > 3);
  const hit = words.filter((w) => to.includes(w)).length;
  return words.length > 0 && hit / words.length >= 0.5;
};

const reachable = results.filter((r) => r.status >= 200 && r.status < 400);
const stranded = reachable.filter((r) => !isLanded(r));
const ok = reachable.filter((r) => isLanded(r));
const bad = results.filter((r) => !(r.status >= 200 && r.status < 400));
const moved = ok.filter((r) => r.finalUrl.replace(/\/+$/, "") !== r.url.replace(/\/+$/, ""));
console.log(`OK ${ok.length}/${results.length}`);
if (moved.length) {
  console.log(`\nREDIRECTED but still on-article (${moved.length}) — fine:`);
  for (const r of moved) console.log(`  ${r.id} → ${r.finalUrl}`);
}
if (stranded.length) {
  console.log(`\n✗ STRANDED — 200 but redirected off the article (${stranded.length}):`);
  for (const r of stranded) console.log(`  ${r.id}\n    ${r.url}\n → ${r.finalUrl}`);
}
if (bad.length) { console.log(`\n✗ FAILED (${bad.length}):`); for (const r of bad) console.log(`  ${r.id} [${r.status || r.err}] ${r.url}`); }
process.exit(bad.length + stranded.length ? 1 : 0);
