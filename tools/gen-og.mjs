// tools/gen-og.mjs — render the 1200x627 share card for any achievement.
//
// WHY THIS EXISTS
// `badges.ts` derives its achievement ids FROM THE SPINE, so adding the 7th domain
// created `domain-cloud-platform` automatically. Its badge art was generated, its
// OG card was not — and `/[locale]/achievement/[id]` builds `ogImage =
// /og/${id}.png`, so that one card 404'd on LinkedIn, which is the file's only
// job. The other 16 were produced by a one-off pass that is not in the repo, which
// is exactly why the 17th went missing.
//
// This script is the reproducible replacement: it composes the card in a headless
// browser from the badge art and the achievement's own title and criteria, so a
// future 8th domain is one command away instead of a manual step nobody remembers.
//
//   node tools/gen-og.mjs                      # any id missing a card
//   node tools/gen-og.mjs domain-cloud-platform  # one specific id
//   node tools/gen-og.mjs --all                # re-render everything
//
// Deliberately NOT diffusion art: the existing cards are flat RGB compositions
// (verified: colortype 2, no alpha), and a generated painting would not match
// them. The badge medallion is the art; the card is its frame.
import { chromium } from "@playwright/test";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OG = join(ROOT, "public", "og");
const BADGES = join(ROOT, "public", "badges");

// Derive the achievement list the same way `badges.ts` does — from the spine —
// rather than hardcoding it, so this script cannot drift from the real ids.
const curriculum = JSON.parse(readFileSync(join(ROOT, "src/content/data/curriculum.json"), "utf8"));
const axes = readFileSync(join(ROOT, "src/lib/axes.ts"), "utf8");
const badgesSrc = readFileSync(join(ROOT, "src/lib/badges.ts"), "utf8");

/** Axis display name for a domain id, read out of axes.ts. */
function axisName(domainId) {
  const block = axes.slice(axes.indexOf(`key: "${domainId}"`));
  const m = /name:\s*\{\s*en:\s*"([^"]+)"/.exec(block);
  return m ? m[1] : domainId;
}
/** Accent colour for a domain, read out of the DOMAIN_ACCENT map in badges.ts. */
function accentOf(domainId) {
  const m = new RegExp(`"${domainId}":\\s*"(#[0-9a-f]{3,8})"`, "i").exec(badgesSrc);
  return m ? m[1] : "#dad45e";
}

const CHECKPOINTS = curriculum.checkpoints.length;
const DOMAINS = curriculum.domains.map((d) => d.id);
const LEVELS = ["l3", "l4", "l5", "l6", "l7"];

const MILESTONES = {
  "first-checkpoint": ["First Checkpoint", "Clear any one checkpoint at the mastery gate.", "#7fb3d5"],
  "gauntlet-coldread": ["Cold Read", "Score 70% or better on your first Gauntlet attempt.", "#e08a5a"],
  "ten-concepts": ["Ten Concepts Studied", "Read ten curriculum concepts.", "#9ec8a0"],
  "half-climb": ["Half the Climb", `Clear at least half of the ${CHECKPOINTS} checkpoints.`, "#c9a0dc"],
  "full-climb": ["The Full Climb", `Clear all ${CHECKPOINTS} checkpoints across every domain and level.`, "#dad45e"],
};

const ALL = [
  ...Object.entries(MILESTONES).map(([id, [title, criteria, accent]]) => ({ id, title, criteria, accent, kind: "Milestone" })),
  ...DOMAINS.map((d) => ({
    id: `domain-${d}`,
    title: `${axisName(d)} Mastery`,
    criteria: `Clear all ${axisName(d)} checkpoints (L3 to L7).`,
    accent: accentOf(d),
    kind: "Domain mastery",
  })),
  ...LEVELS.map((l) => ({
    id: `level-${l}`,
    title: `${l.toUpperCase()} Ascension`,
    criteria: `Clear all ${DOMAINS.length} ${l.toUpperCase()} checkpoints.`,
    accent: "#8fa8c8",
    kind: "Level ascension",
  })),
];

const args = process.argv.slice(2);
const all = args.includes("--all");
const wanted = args.filter((a) => !a.startsWith("--"));
const targets = ALL.filter((a) => {
  if (wanted.length) return wanted.includes(a.id);
  if (all) return true;
  return !existsSync(join(OG, `${a.id}.png`));
});

if (!targets.length) {
  console.log("✓ every derived achievement already has an OG card");
  process.exit(0);
}

/** The card, as a self-contained page. Fonts are the ones the site ships. */
function html({ title, criteria, accent, kind, badgeDataUri }) {
  return `<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: "DM Serif"; src: local("DM Serif Display"), local("Georgia"); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 627px; display: flex; align-items: center; gap: 56px;
    padding: 0 72px; background: #0b1017; color: #eef2f7; overflow: hidden;
    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
    position: relative;
  }
  /* The accent wash and hairline grid the site's own cards use. */
  body::before {
    content: ""; position: absolute; inset: 0;
    background:
      radial-gradient(120% 90% at 88% 18%, ${accent}22 0%, transparent 62%),
      linear-gradient(180deg, #0f1620 0%, #0b1017 100%);
  }
  body::after {
    content: ""; position: absolute; inset: 0; opacity: 0.05;
    background-image:
      linear-gradient(${accent} 1px, transparent 1px),
      linear-gradient(90deg, ${accent} 1px, transparent 1px);
    background-size: 48px 48px;
  }
  /* The badge art was generated on an opaque dark square, not with a transparent
     background, so a hard box edge is visible against any card. The existing 16
     cards ship that edge. A radial mask feathers it into the card instead of
     pretending the art has alpha it does not have. */
  .art { position: relative; width: 300px; height: 300px; flex: 0 0 auto; }
  .art img {
    width: 100%; height: 100%; object-fit: contain;
    filter: drop-shadow(0 10px 34px ${accent}44);
    -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 60%, transparent 74%);
    mask-image: radial-gradient(circle at 50% 50%, #000 60%, transparent 74%);
  }
  .copy { position: relative; flex: 1 1 auto; min-width: 0; }
  .kind { font-size: 20px; letter-spacing: 0.16em; text-transform: uppercase;
          color: ${accent}; font-weight: 600; margin-bottom: 18px; }
  h1 { font-family: "DM Serif", Georgia, serif; font-size: 62px; line-height: 1.06;
       font-weight: 400; letter-spacing: -0.01em; margin-bottom: 22px; }
  p { font-size: 25px; line-height: 1.42; color: #b9c4d2; max-width: 640px; }
  .rule { width: 92px; height: 3px; background: ${accent}; margin: 30px 0 24px; }
  .brand { font-size: 19px; letter-spacing: 0.1em; text-transform: uppercase;
           color: #7d8b9c; font-weight: 600; }
</style>
<div class="art"><img src="${badgeDataUri}" alt=""></div>
<div class="copy">
  <div class="kind">${kind}</div>
  <h1>${title}</h1>
  <p>${criteria}</p>
  <div class="rule"></div>
  <div class="brand">Level Up &middot; levelup.skillrealm.dev</div>
</div>`;
}

mkdirSync(OG, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 627 }, deviceScaleFactor: 1 });

let made = 0;
for (const a of targets) {
  const badgePath = join(BADGES, `${a.id}.webp`);
  if (!existsSync(badgePath)) {
    console.log(`  ! ${a.id}: no badge art at public/badges/${a.id}.webp — skipped`);
    continue;
  }
  const badgeDataUri = `data:image/webp;base64,${readFileSync(badgePath).toString("base64")}`;
  await page.setContent(html({ ...a, badgeDataUri }), { waitUntil: "load" });
  await page.waitForTimeout(120);
  const buf = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1200, height: 627 } });
  writeFileSync(join(OG, `${a.id}.png`), buf);
  console.log(`  ✓ og/${a.id}.png (${(buf.length / 1024).toFixed(0)} KB)`);
  made++;
}

await browser.close();
console.log(`\n${made} card(s) written to public/og/`);
