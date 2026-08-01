#!/usr/bin/env node
/* Link-liveness check for the resource library. Follows redirects (a 301 to a
   stable new home is fine — the promise is "this link works", not "this link
   never moved"). Reports the final status per URL.
   Usage: node tools/check-links.mjs <file.json> [file2.json ...]
          node tools/check-links.mjs --codex        # the Codex's own 121 sources

   `--codex` exists because the Codex shipped 107 entry sources plus 14 redrawn
   architecture sources that had never been through this gate at all, and its
   entire pitch is that every claim is checkable against a page you can open. Two
   of them were defects on the first run: one 200-but-redirects-off-the-article,
   one that answers 302 to a bare fetch. */
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
const files = args.filter((a) => !a.startsWith("--"));

/** Flatten the Codex into the {id, url} shape the rest of this script expects. */
function codexLinks() {
  const codex = JSON.parse(readFileSync("src/content/data/codex.json", "utf8"));
  const out = [];
  for (const cluster of codex.clusters ?? []) {
    for (const e of cluster.entries ?? []) {
      out.push({ id: `entry:${e.slug}`, url: e.source, __f: "codex.json" });
    }
  }
  for (const a of codex.architectures ?? []) {
    out.push({ id: `arch:${a.slug}`, url: a.source, __f: "codex.json" });
  }
  return out;
}

const all = args.includes("--codex")
  ? codexLinks()
  : files.flatMap((f) => JSON.parse(readFileSync(f, "utf8")).resources.map((r) => ({ ...r, __f: f })));
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

/**
 * Hosts that refuse an automated fetch while serving the page fine in a browser.
 *
 * This is NOT an amnesty list for dead links. Each entry was checked by hand and
 * the page confirmed to load and to carry the content it is cited for; what fails
 * is the fetch, not the link. Treating a bot block as a dead link is worse than
 * useless — it trains people to ignore the gate, which is the one thing a gate
 * cannot survive.
 *
 * The distinction is testable: a bot block returns 403 or refuses the connection
 * on EVERY path of the host, and the page opens in a browser. A dead link 404s, or
 * 200s onto a generic index (which `isLanded` catches separately).
 *
 *   dl.acm.org        — 403 to any non-browser UA. The canonical DOI home for
 *                       papers, so there is no better URL to cite.
 *   milvus.io         — answers 302 in a loop to curl/fetch; verified to render
 *                       the IVF_PQ params it is cited for.
 *   hal.cs.princeton  — refuses the connection to fetch; verified to render the
 *                       cost-per-task leaderboard it is cited for.
 */
const BOT_BLOCKED = ["dl.acm.org", "milvus.io", "hal.cs.princeton.edu"];
const isBotBlocked = (u) => {
  try { return BOT_BLOCKED.some((h) => new URL(u).hostname.endsWith(h)); }
  catch { return false; }
};

const blocked = results.filter((r) => !(r.status >= 200 && r.status < 400) && isBotBlocked(r.url));
if (blocked.length) {
  console.log(`\nBOT-BLOCKED (${blocked.length}) — verified by hand, not dead:`);
  for (const r of blocked) console.log(`  ${r.id} ${r.url}`);
}

const reachable = results.filter((r) => r.status >= 200 && r.status < 400);
const stranded = reachable.filter((r) => !isLanded(r));
const ok = reachable.filter((r) => isLanded(r));
// Bot-blocked hosts are reported above and excluded here: the link is not dead,
// the fetch is refused. Everything else that did not resolve is a real failure.
const bad = results.filter((r) => !(r.status >= 200 && r.status < 400) && !isBotBlocked(r.url));
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
