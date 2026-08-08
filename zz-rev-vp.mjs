import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const [w, h] of [[1280, 900], [768, 900], [360, 740]]) {
  const ctx = await b.newContext({ viewportSize: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto("http://127.0.0.1:4180/en/codex/", { waitUntil: "domcontentloaded" });
  console.log("asked", w, h, "=>", await p.evaluate(() => [window.innerWidth, window.innerHeight, window.devicePixelRatio, matchMedia("(min-width:1051px)").matches]));
  await ctx.close();
}
// also the setViewportSize form
const ctx = await b.newContext();
const p = await ctx.newPage();
await p.setViewportSize({ width: 360, height: 740 });
await p.goto("http://127.0.0.1:4180/en/codex/", { waitUntil: "domcontentloaded" });
console.log("setViewportSize 360 =>", await p.evaluate(() => [window.innerWidth, window.innerHeight]));
await b.close();
