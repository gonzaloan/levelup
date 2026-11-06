#!/usr/bin/env node
// Link liveness for every `sources[].url`. Uses curl (respects HTTPS_PROXY), follows redirects.
// Reports 4xx/5xx/timeouts. Some sites block non-browser clients (403/429): those are listed
// separately as "blocked?" — verify them by hand before deleting a source.
// Usage: node tools/check-links.mjs [--json out.json]
import fs from "node:fs";
import { execFile } from "node:child_process";
import { listConceptFiles } from "./content-lib.mjs";

const urls = new Map();
for (const f of listConceptFiles()) {
  const c = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const s of c.sources || []) { if (!urls.has(s.url)) urls.set(s.url, []); urls.get(s.url).push(c.id); }
}
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const check = (url) => new Promise((res) => {
  execFile("curl", ["-sS", "-L", "-o", "/dev/null", "--max-time", "25", "-A", UA, "-w", "%{http_code} %{url_effective}", url], (err, out) => {
    const [code, eff] = String(out || "").trim().split(" ");
    res({ url, code: Number(code) || 0, eff, err: err ? String(err.message).split("\n")[0] : null });
  });
});
const list = [...urls.keys()];
const results = [];
let i = 0;
await Promise.all(Array.from({ length: 8 }, async () => { while (i < list.length) { const u = list[i++]; results.push(await check(u)); } }));
const bad = results.filter((r) => r.code === 0 || r.code === 404 || r.code === 410 || r.code >= 500);
const blocked = results.filter((r) => [401, 403, 429, 999].includes(r.code));
for (const r of bad) console.log(`DEAD ${r.code || "ERR"} ${r.url}  (${urls.get(r.url).join(", ")})`);
for (const r of blocked) console.log(`blocked? ${r.code} ${r.url}  (${urls.get(r.url).join(", ")})`);
console.log(`\n${results.length} urls: ${results.length - bad.length - blocked.length} ok, ${bad.length} dead, ${blocked.length} blocked?`);
const j = process.argv.indexOf("--json");
if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify({ bad, blocked, refs: Object.fromEntries(urls) }, null, 1));
process.exit(bad.length ? 1 : 0);
