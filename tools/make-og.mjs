// Renders public/og.png (1200×630), the image shown when a link is shared, and the app icons
// (public/icon-192.png, icon-512.png) for the web manifest. Run it by hand when
// the brand changes (needs Chromium, like `npm run diagrams`); the output is committed.
import path from "node:path";
import { ROOT, launchBrowser } from "./content-lib.mjs";

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: #0b0e14; color: #e8eaf0; font-family: Inter, "Segoe UI", system-ui, sans-serif;
    display: flex; flex-direction: column; justify-content: space-between; padding: 72px 80px;
    background-image: radial-gradient(900px 500px at 100% 0%, rgba(255,181,71,0.16), transparent 60%), radial-gradient(700px 420px at 0% 100%, rgba(96,165,250,0.12), transparent 60%); }
  .brand { display: flex; align-items: center; gap: 18px; font-size: 40px; font-weight: 800; letter-spacing: -0.02em; }
  .mark { width: 30px; height: 30px; background: #ffb547; transform: rotate(45deg); border-radius: 5px; }
  h1 { font-size: 76px; line-height: 1.04; font-weight: 800; letter-spacing: -0.03em; max-width: 980px; }
  h1 span { color: #ffb547; }
  .row { display: flex; flex-wrap: wrap; gap: 12px; }
  .chip { font-size: 25px; font-weight: 600; padding: 10px 20px; border-radius: 999px; border: 1.5px solid #2f3a4e; background: #121722; color: #b9c0ce; }
  .foot { display: flex; justify-content: space-between; align-items: flex-end; font-size: 24px; color: #8b94a7; }
</style></head><body>
  <div class="brand"><span class="mark"></span>levelup</div>
  <h1>Staff Engineer &amp; <span>AI Architect</span> Field Guide</h1>
  <div>
    <div class="row">
      <span class="chip">Coding patterns</span><span class="chip">System design</span><span class="chip">Distributed systems</span>
      <span class="chip">AI systems</span><span class="chip">Leadership</span>
    </div>
    <div class="foot" style="margin-top:26px"><span>Diagrams · labs · practice · mock interviews</span><span>EN · ES</span></div>
  </div>
</body></html>`;

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
const out = path.join(ROOT, "public", "og.png");
await page.screenshot({ path: out, type: "png" });
console.log("wrote", path.relative(ROOT, out));

// App icons for the web manifest (install to home screen). The mark sits inside the maskable safe zone.
for (const size of [192, 512]) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" style="display:block"><rect width="32" height="32" fill="#0b0e14"/><path d="M16 7 25 16 16 25 7 16z" fill="#ffb547"/><path d="M16 12 20 16 16 20 12 16z" fill="#0b0e14"/></svg>`);
  const file = path.join(ROOT, "public", `icon-${size}.png`);
  await p.screenshot({ path: file, type: "png" });
  console.log("wrote", path.relative(ROOT, file));
}
await browser.close();
