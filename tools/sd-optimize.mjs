#!/usr/bin/env node
/* Downscale + WebP-encode SD output into public/. Decorative art only.
   Usage: node tools/sd-optimize.mjs <in.png> <out.webp> [width] [quality] */
import sharp from "sharp";
const [, , src, dest, w = "1280", q = "78"] = process.argv;
if (!src || !dest) { console.error("usage: sd-optimize.mjs <in> <out> [width] [quality]"); process.exit(1); }
const info = await sharp(src).resize({ width: Number(w), withoutEnlargement: true })
  .webp({ quality: Number(q) }).toFile(dest);
console.log(`OK ${dest} ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}KB`);
