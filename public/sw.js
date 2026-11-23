// levelup service worker: what you have visited, or saved with "Save for offline", keeps working
// without a connection. Same-origin GETs only; sign-in and sync requests never pass through here.
//
// Two caches (names shared with src/lib/offline.ts):
//   lu-pages-1   pages and data, NETWORK FIRST: online you always get the deployed version; the
//                cached copy answers when the network fails or takes more than 4 s.
//   lu-assets-1  /_next/static/* (content-hashed, immutable), CACHE FIRST.
// Text bodies are stored gzipped (a page is ~170 KB raw, ~25 KB gzipped) and inflated on the way out.
// A bug here outlives the deploy that fixes it: the kill switch is deploy/sw-kill.js (see deploy/README.md).
const PAGES = "lu-pages-1";
const ASSETS = "lu-assets-1";
const TEXT = /^(text\/|application\/(json|javascript|manifest\+json)|image\/svg)/;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("lu-") && k !== PAGES && k !== ASSETS) await caches.delete(k);
  await self.clients.claim();
})()));

// One entry per path: "?_rsc=…" and other query strings do not create copies, and
// "/app/[locale]/x.js" and "/app/%5Blocale%5D/x.js" (how Next writes it) are the same entry.
const keyOf = (url) => {
  try { return url.origin + encodeURI(decodeURI(url.pathname)); } catch { return url.origin + url.pathname; }
};

function pack(res) {
  const type = res.headers.get("content-type") || "";
  if (!res.body || typeof CompressionStream === "undefined" || !TEXT.test(type)) return res;
  return new Response(res.body.pipeThrough(new CompressionStream("gzip")), { headers: { "content-type": type, "x-lu-enc": "gzip" } });
}
function unpack(res) {
  if (!res || res.headers.get("x-lu-enc") !== "gzip") return res;
  return new Response(res.body.pipeThrough(new DecompressionStream("gzip")), { headers: { "content-type": res.headers.get("content-type") || "" } });
}
const keep = (cache, key, res) => { if (res.ok && res.type === "basic" && res.status === 200) cache.put(key, pack(res.clone())).catch(() => undefined); };

async function cacheFirst(req, url) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(keyOf(url));
  if (hit) return unpack(hit);
  const res = await fetch(req);
  keep(cache, keyOf(url), res);
  return res;
}

const OFFLINE_PAGE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · levelup</title>'
  + '<body style="font:16px/1.6 system-ui,sans-serif;max-width:32rem;margin:18vh auto;padding:0 20px;background:#0b0e14;color:#e8eaf0">'
  + '<h1 style="font-size:22px">Sin conexión · Offline</h1><p>Esta página no está guardada en este dispositivo.<br>This page is not saved on this device.</p>'
  + '<p><a style="color:#ffb547" href="/">levelup →</a></p>';

async function networkFirst(req, url) {
  const cache = await caches.open(PAGES);
  const key = keyOf(url);
  const hit = await cache.match(key);
  const net = fetch(req).then((res) => { keep(cache, key, res); return res; });
  if (hit) {
    const slow = new Promise((resolve) => setTimeout(resolve, 4000, null));
    const res = await Promise.race([net.catch(() => null), slow]);
    return res || unpack(hit);
  }
  try { return await net; } catch (e) {
    if (req.mode === "navigate") return new Response(OFFLINE_PAGE, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
    throw e;
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/auth") || url.pathname === "/sw.js") return;
  if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;
  if (req.headers.has("range")) return;
  e.respondWith(url.pathname.startsWith("/_next/static/") ? cacheFirst(req, url) : networkFirst(req, url));
});
