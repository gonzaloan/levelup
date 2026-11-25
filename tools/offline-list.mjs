// After `next build`: writes out/offline-<locale>.json, the list "Save for offline" downloads —
// every page of that language, the hashed JS/CSS and the illustration files — with the gzipped
// size so the button can say how much it is. Pyodide (~13 MB) is left out: the coding pages cache
// it the first time they run.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { ROOT } from "./content-lib.mjs";

const OUT = path.join(ROOT, "out");
if (!fs.existsSync(OUT)) { console.log("offline-list: no out/ (run next build first)"); process.exit(1); }
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const gz = (f) => zlib.gzipSync(fs.readFileSync(f), { level: 6 }).length;
// Percent-encoded the way Next writes its own URLs ("app/%5Blocale%5D/…"): the worker's cache key.
const url = (f) => encodeURI("/" + path.relative(OUT, f).split(path.sep).join("/"));

const assetFiles = [...walk(path.join(OUT, "_next", "static")), ...walk(path.join(OUT, "ill")), path.join(OUT, "icon.svg")].filter((f) => fs.existsSync(f));
const assets = assetFiles.map(url);
const assetBytes = assetFiles.reduce((n, f) => n + gz(f), 0);
const build = fs.existsSync(path.join(OUT, "_next", "static")) ? fs.readdirSync(path.join(OUT, "_next", "static")).find((d) => fs.existsSync(path.join(OUT, "_next", "static", d, "_buildManifest.js"))) ?? "" : "";

// A language folder is a two-letter directory with its own home page (not "py", the Python runner).
for (const locale of fs.readdirSync(OUT).filter((d) => /^[a-z]{2}$/.test(d) && fs.existsSync(path.join(OUT, d, "index.html")))) {
  // Interviewer sheets are used live, on a call: they stay out of the offline download.
  const html = walk(path.join(OUT, locale)).filter((f) => path.basename(f) === "index.html" && !f.includes(`${path.sep}interviewer${path.sep}`));
  // "/es/c/rag/index.html" is served, and cached, as "/es/c/rag/".
  const pages = html.map((f) => url(f).replace(/index\.html$/, "")).sort();
  const bytes = html.reduce((n, f) => n + gz(f), 0) + assetBytes;
  fs.writeFileSync(path.join(OUT, `offline-${locale}.json`), JSON.stringify({ build, bytes, pages, assets }));
  console.log(`offline-list: ${locale} → ${pages.length} pages + ${assets.length} assets, ~${(bytes / 1e6).toFixed(1)} MB gzipped`);
}
