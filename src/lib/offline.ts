// "Save for offline": downloads every page of one language into the caches the service worker
// (public/sw.js) reads. The cache names and the gzip marker are shared with that file.
export const PAGES = "lu-pages-1";
export const ASSETS = "lu-assets-1";
const TEXT = /^(text\/|application\/(json|javascript|manifest\+json)|image\/svg)/;
const KEY = "fg.offline.v1";

export interface OfflineList { build: string; bytes: number; pages: string[]; assets: string[] }
export interface Saved { at: number; build: string; locale: string; n: number }

export const offlineSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window;

/** The worker is off on localhost (it would cache a dev server) unless localStorage fg.sw = "on". */
export function swEnabled(): boolean {
  try {
    const flag = localStorage.getItem("fg.sw");
    if (flag === "off") return false;
    return flag === "on" || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  } catch { return false; }
}

export function loadSaved(): Saved | null { try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; } }

function pack(res: Response): Response {
  const type = res.headers.get("content-type") ?? "";
  if (!res.body || typeof CompressionStream === "undefined" || !TEXT.test(type)) return res;
  return new Response(res.body.pipeThrough(new CompressionStream("gzip")), { headers: { "content-type": type, "x-lu-enc": "gzip" } });
}

/** Fetches the list and stores every entry; `onProgress(done, total)` after each one. Returns what was saved. */
export async function saveForOffline(locale: string, onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<Saved> {
  const list = (await (await fetch(`/offline-${locale}.json`, { cache: "no-cache", signal })).json()) as OfflineList;
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const jobs = [...list.assets.map((u) => ({ u, c: u.startsWith("/_next/static/") ? assets : pages })), ...list.pages.map((u) => ({ u, c: pages }))];
  let done = 0;
  let failed = 0;
  const next = async () => {
    for (let job = jobs.pop(); job; job = jobs.pop()) {
      try {
        const res = await fetch(job.u, { signal });
        if (res.ok) await job.c.put(location.origin + job.u, pack(res)); else failed++;
      } catch (e) { if (signal?.aborted) throw e; failed++; }
      onProgress(++done, total);
    }
  };
  const total = jobs.length;
  await Promise.all(Array.from({ length: 6 }, next));
  if (failed > total * 0.02) throw new Error(`${failed} of ${total} files failed`);
  // Hashed files from older builds are no longer referenced by any saved page.
  const current = new Set(list.assets.map((u) => location.origin + u));
  for (const req of await assets.keys()) if (!current.has(req.url)) await assets.delete(req);
  const saved: Saved = { at: Date.now(), build: list.build, locale, n: total - failed };
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* ignore */ }
  return saved;
}

export async function clearOffline() {
  for (const k of await caches.keys()) if (k.startsWith("lu-")) await caches.delete(k);
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
