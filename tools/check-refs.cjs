#!/usr/bin/env node
/**
 * tools/check-refs.cjs — every id the content points at must resolve.
 *
 * WHY THIS EXISTS
 * `ai-l5.json` referenced 16 diagram ids that are absent from the `DIAGRAMS`
 * registry in `src/components/Diagram.tsx`. `Diagram` does `if (!D) return null`,
 * so those 16 figures rendered NOTHING, silently — verified in the built output:
 * `out/en/module/ai-l5-m1/index.html` contains zero `figure class="card blueprint"`
 * while `gen-l5-m1` contains two. The flagship AI track taught `mcp-architecture`,
 * `dual-llm-isolation` and `untrusted-code-boundary` — boundary and data-flow
 * subjects — with prose alone, while claiming a figure.
 *
 * `DIAGRAM_IDS` was exported from `Diagram.tsx` specifically so something could
 * validate against it, and was referenced by nothing. An export whose only purpose
 * is validation, with no validator, is the shape of this whole class of bug: the
 * registry and the content drift apart and nothing notices.
 *
 * This script resolves every cross-reference in the content against the code that
 * has to render it, for ALL registries at once — diagrams, viz widgets, and the
 * asset manifest — because the next drift will be in whichever one is unchecked.
 *
 *   node tools/check-refs.cjs
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "src", "content", "data");
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
const source = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const errors = [];
const err = (msg) => errors.push(msg);

// ── Registry 1: authored SVG figures (Diagram.tsx) ───────────────────────────
// Parse the object literal rather than importing: this is a .cjs script and
// Diagram.tsx is a client component with JSX.
function registryKeys(src, marker) {
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`cannot find ${marker} — the registry changed shape`);
  const open = src.indexOf("{", start);
  let depth = 0, end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = src.slice(open + 1, end);
  // Keys are either "quoted-with-dashes": or bareIdentifier: at depth 1.
  return [...body.matchAll(/(?:^|\n)\s*(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/g)]
    .map((m) => m[1] || m[2]);
}

const DIAGRAM_IDS = registryKeys(source("src/components/Diagram.tsx"), "const DIAGRAMS: Record<string, Fig>");
const WIDGET_IDS = registryKeys(source("src/components/viz/index.ts"), "const WIDGETS: Record<string");

// ── Check: legacy module topic diagrams ──────────────────────────────────────
let moduleRefs = 0, moduleDead = 0;
for (const file of ["ai-l5.json", "general-l5.json"]) {
  const blob = read(file);
  for (const m of blob.modules || []) {
    for (const t of m.topics || []) {
      if (!t.diagram) continue;
      moduleRefs++;
      if (!DIAGRAM_IDS.includes(t.diagram)) {
        moduleDead++;
        err(`${file} ${m.id}/${t.id}: diagram "${t.diagram}" is not in the DIAGRAMS registry — it renders nothing`);
      }
    }
  }
}

// ── Check: lesson + codex widget references ──────────────────────────────────
let widgetRefs = 0, widgetDead = 0;
const lessons = read("lessons.json").lessons;
for (const l of lessons) {
  for (const c of l.concepts) {
    if (!c.visual?.widgetId) continue;
    widgetRefs++;
    if (!WIDGET_IDS.includes(c.visual.widgetId)) {
      widgetDead++;
      err(`lessons.json ${l.lessonId}/${c.slug}: widgetId "${c.visual.widgetId}" is not in the viz registry`);
    }
  }
}
const codex = read("codex.json");
for (const cl of codex.clusters) {
  for (const e of cl.entries) {
    if (!e.visual?.widgetId) continue;
    widgetRefs++;
    if (!WIDGET_IDS.includes(e.visual.widgetId)) {
      widgetDead++;
      err(`codex.json ${e.slug}: widgetId "${e.visual.widgetId}" is not in the viz registry`);
    }
  }
}

// ── Check: public/ files the code names must exist ───────────────────────────
// Only literal paths — template literals are resolved by the badge/OG check below.
let assetRefs = 0, assetMissing = 0;
const componentFiles = [];
(function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(ent.name)) componentFiles.push(p);
  }
})(path.join(ROOT, "src"));

for (const f of componentFiles) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/["'`](\/(?:hero|bosses|badges|og|worlds|brand)\/[a-z0-9._-]+)["'`]/gi)) {
    assetRefs++;
    if (!fs.existsSync(path.join(ROOT, "public", m[1]))) {
      assetMissing++;
      err(`${path.relative(ROOT, f)}: references ${m[1]}, which does not exist in public/`);
    }
  }
}

// ── Check: every derived badge id has both its art and its OG card ───────────
// `badges.ts` derives its ids from the spine, and the achievement pages build
// `/og/${id}.png` at build time. A missing OG card 404s on LinkedIn, which is
// that file's only job — so a derived id with no card is a broken share.
const curriculum = read("curriculum.json");
const domainIds = curriculum.domains.map((d) => d.id);
const levels = ["l3", "l4", "l5", "l6", "l7"];
const badgeSrc = source("src/lib/badges.ts");
const milestoneIds = [...badgeSrc.matchAll(/id:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
const derivedIds = new Set([
  ...milestoneIds,
  ...domainIds.map((d) => `domain-${d}`),
  ...levels.map((l) => `level-${l}`),
]);
let badgeMissing = 0;
for (const id of derivedIds) {
  for (const [dir, ext] of [["badges", "webp"], ["og", "png"]]) {
    const p = path.join(ROOT, "public", dir, `${id}.${ext}`);
    if (!fs.existsSync(p)) {
      badgeMissing++;
      err(`badge "${id}" is derived from the spine but public/${dir}/${id}.${ext} does not exist`);
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\nregistries: ${DIAGRAM_IDS.length} diagrams, ${WIDGET_IDS.length} viz widgets`);
console.log(`references: ${moduleRefs} module diagrams, ${widgetRefs} widgets, ${assetRefs} literal asset paths, ${derivedIds.size} derived badge ids`);

if (errors.length) {
  console.log(`\n✗ ${errors.length} unresolved reference(s):\n`);
  for (const e of errors) console.log(`  ${e}`);
  console.log("\nEither add the missing registry entry / file, or remove the reference.");
  console.log("A reference that resolves to nothing renders nothing, silently.");
  process.exit(1);
}
console.log("\n✓ every content reference resolves");
