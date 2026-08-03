#!/usr/bin/env node
/**
 * Measures the facts that the section 28 / 42 design documents assert.
 *
 * WHY THIS EXISTS
 * The failure mode of a design document is a number nobody re-derives. This repo
 * already produced one: an early inventory reported 290 "definition" items, of which
 * 273 were check imperatives, and the figure would have gone into a doc unchallenged.
 * So every count in the remaining docs comes from here, and `tests/facts.test.ts`
 * asserts each doc still agrees with the output.
 *
 * Writes docs/transformation/facts.json. Never hand-edit it.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * It does not report a number for anything the platform lacks. `analyticsEvents` is 0
 * because there is no telemetry, and `savedContent` is absent because there is no
 * saving. A doc that reads "0 events instrumented" is useful; one that reports a
 * plausible-looking figure for a system that does not exist is the lie that matters.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "src", "content", "data");
const OUT = path.join(ROOT, "docs", "transformation", "facts.json");

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const curriculum = read("curriculum.json");
const lessons = read("lessons.json");
const codex = read("codex.json");
const checks = read("checks.json");
const builds = read("builds.json");
const resources = read("resources.json");

const LESSONS = lessons.lessons ?? lessons;
const CHECKS = checks.checks ?? checks;
const BUILDS = builds.builds ?? builds;
const CONCEPT_LESSONS = LESSONS.flatMap((l) => l.concepts ?? []);
const SPINE = curriculum.domains.flatMap((d) =>
  d.levels.flatMap((l) => l.concepts.map((c) => ({ ...c, domainId: d.id, level: l.level })))
);
const CODEX_ENTRIES = codex.clusters.flatMap((c) => c.entries);

/**
 * Counts every `en`/`es` leaf so the bilingual claim is measured, not assumed.
 *
 * `empty` is reported as two separate numbers, because the naive count is misleading.
 * The first run found 7 empty strings and each one turned out to be correct content:
 *
 *   - 3 cloze checks whose `segments[0]` is empty because the sentence OPENS with a
 *     blank ("[Backpressure] signals 'slow down'…"). The empty string is the text
 *     before the first blank, and there isn't any.
 *   - 1 of those has `en: ""` and `es: "El "`, which looks like a missing translation
 *     and is not: Spanish needs the article before the noun and English does not. Both
 *     render correctly.
 *   - 1 `diagram` with `kind: "none"` and an empty caption. merge-lessons.cjs documents
 *     this as a deliberate opt-out — the concept teaches through an interactive widget
 *     (`threat-board`) plus an `architecture` figure, so the renderer draws nothing and
 *     `ConceptPane.tsx:184` guards on `kind !== "none"`.
 *
 * So `emptyStructural` is the expected count and `emptyProse` is the one that must stay
 * zero. Reporting a single "7 empty strings" figure in a document would have described
 * a translation gap that does not exist.
 */
function i18nCount() {
  let en = 0, es = 0, enChars = 0, esChars = 0;
  let emptyStructural = 0, emptyProse = 0;
  const structural = [];
  const walk = (o, pathStr, ctx) => {
    if (!o || typeof o !== "object") return;
    // A `kind: "none"` schematic's caption, and a cloze segment, are positional slots
    // rather than prose fields.
    const isNoneDiagram = ctx.noneDiagram || o.kind === "none";
    for (const [k, v] of Object.entries(o)) {
      const p = `${pathStr}.${k}`;
      if (typeof v === "string") {
        if (k === "en") { en++; enChars += v.length; }
        else if (k === "es") { es++; esChars += v.length; }
        else continue;
        if (!v.trim()) {
          if (isNoneDiagram || /\.segments\.\d+\./.test(p)) { emptyStructural++; structural.push(p); }
          else emptyProse++;
        }
      } else walk(v, p, { noneDiagram: isNoneDiagram });
    }
  };
  for (const f of ["curriculum.json", "lessons.json", "codex.json", "checks.json", "builds.json", "resources.json"]) {
    walk(read(f), f, {});
  }
  return { en, es, enChars, esChars, emptyStructural, emptyProse, structuralPaths: structural };
}

// ── learning model: which of the 8 stages does each concept actually have? ──
// Section 23 requires prediction, a meaningful decision, immediate feedback, build or
// inspection, recall and transfer. This measures presence per concept rather than
// asserting the flow exists because the components are on the page.
const STAGE_FIELDS = {
  predict: (c) => Boolean(c.predict),
  read: (c) => Boolean(c.explanation),
  see: (c) => Boolean(c.diagram && c.diagram.kind !== "none") || Boolean(c.visual) || Boolean(c.architecture),
  worked: (c) => Boolean(c.example),
  practice: (c) => CHECKS.some((k) => k.concept === c.slug),
  recall: (c) => Boolean(c.flashcards?.length),
  build: (c) => BUILDS.some((b) => b.concept === c.slug),
  explain: () => false,   // no free-text articulation surface exists
  transfer: () => false,  // no second-context item type exists
};
const stageCoverage = {};
for (const [stage, has] of Object.entries(STAGE_FIELDS)) {
  stageCoverage[stage] = CONCEPT_LESSONS.filter((c) => has(c)).length;
}

// ── accessibility: what the source can be held to statically ──────────────
const A11Y = (() => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(e.name)) files.push(rel);
    }
  };
  walk("src");
  const all = files.map((f) => ({ f, t: src(f) }));
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return {
    tsxFiles: files.length,
    withAriaLabel: all.filter(({ t }) => /aria-label/.test(strip(t))).length,
    withRole: all.filter(({ t }) => /role="/.test(strip(t))).length,
    imagesWithAlt: all.reduce((a, { t }) => a + (strip(t).match(/<(?:img|Image)[^>]*\balt=/g) || []).length, 0),
    imagesTotal: all.reduce((a, { t }) => a + (strip(t).match(/<(?:img|Image)\b/g) || []).length, 0),
    prefersReducedMotion: all.filter(({ t }) => /prefers-reduced-motion|useReducedMotion|MOTION/.test(strip(t))).length,
    // 2.5.8 target size: the audit fixed three nav controls from 40px to 44px.
    cssFiles: fs.readdirSync(path.join(ROOT, "src", "app", "styles")).filter((f) => f.endsWith(".css")).length,
  };
})();

// ── visual assets ─────────────────────────────────────────────────────────
const VISUAL = (() => {
  const kinds = {};
  const figures = [];
  const collect = (d, ownerId) => {
    if (!d) return;
    kinds[d.kind] = (kinds[d.kind] || 0) + 1;
    figures.push({ owner: ownerId, kind: d.kind, hasCaption: Boolean(d.caption?.en?.trim()) });
  };
  for (const c of CONCEPT_LESSONS) { collect(c.diagram, c.slug); collect(c.architecture, c.slug); }
  for (const e of CODEX_ENTRIES) collect(e.diagram, e.slug);
  for (const a of codex.architectures ?? []) collect(a.diagram, a.slug);

  const pub = path.join(ROOT, "public");
  const walkPub = (dir, acc = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walkPub(path.join(dir, e.name), acc);
      else acc.push(path.join(dir, e.name));
    }
    return acc;
  };
  const assets = fs.existsSync(pub) ? walkPub(pub) : [];
  const byExt = {};
  let bytes = 0;
  for (const f of assets) {
    const ext = path.extname(f).toLowerCase() || "(none)";
    byExt[ext] = (byExt[ext] || 0) + 1;
    bytes += fs.statSync(f).size;
  }
  const vizDir = path.join(ROOT, "src", "components", "viz");
  return {
    figures: figures.length,
    byKind: kinds,
    // `withoutCaption` is 1 and that 1 is the deliberate `kind: "none"` opt-out — see
    // the i18nCount comment. It is not a missing caption.
    withoutCaption: figures.filter((f) => !f.hasCaption).length,
    // Named `axesFigures`, not `emptyAxes`: the earlier field name claimed these were
    // empty and the expression only counted axes figures of any kind. Seven really were
    // empty and were fixed; check-axes.cjs now guards the class, so a figure with no
    // nodes fails the build rather than showing up as a number in a document.
    axesFigures: figures.filter((f) => f.kind === "axes").length,
    interactiveWidgets: fs.existsSync(vizDir)
      ? fs.readdirSync(vizDir).filter((f) => f.endsWith(".tsx")).length : 0,
    conceptsUsingWidget: CONCEPT_LESSONS.filter((c) => c.visual).length,
    publicAssets: assets.length,
    publicBytes: bytes,
    publicByExt: byExt,
  };
})();

// ── validation surface ────────────────────────────────────────────────────
const VALIDATION = (() => {
  const pkg = JSON.parse(src("package.json"));
  const chain = (name) => (pkg.scripts[name] || "").split("&&").map((s) => s.trim()).filter(Boolean);
  const testFiles = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(test|spec)\.ts$/.test(e.name)) testFiles.push(rel);
    }
  };
  walk("tests");
  const unit = testFiles.filter((f) => !f.includes("/visual/"));
  const e2e = testFiles.filter((f) => f.includes("/visual/"));
  // Vitest uses `it(`, Playwright uses `test(`. Counting only `it(` reported "0 e2e
  // tests" while 19 spec files sat in tests/visual/ — a zero that would have gone into
  // validation-report.md as evidence of a gap that does not exist. Both are matched.
  const countTests = (files) =>
    files.reduce((a, f) => a + (src(f).match(/^\s*(?:it|test)\(/gm) || []).length, 0);
  const baselines = fs.readdirSync(__dirname).filter((f) => /baseline/.test(f));
  return {
    contentValidators: chain("content:check").length,
    selfTests: chain("gates:selftest").length,
    verifySteps: chain("verify").length,
    unitTestFiles: unit.length,
    unitTests: countTests(unit),
    e2eSpecFiles: e2e.length,
    e2eTests: countTests(e2e),
    baselineFiles: baselines.length,
    baselineNames: baselines.sort(),
  };
})();

// ── analytics: the honest answer is zero ──────────────────────────────────
const ANALYTICS = (() => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(e.name)) files.push(rel);
    }
  };
  walk("src");
  const joined = files.map(src).join("\n");
  return {
    // Searched for, and absent. This is the finding, not a gap in the measurement.
    trackingCalls: (joined.match(/\b(gtag|analytics\.track|posthog|mixpanel|amplitude|plausible)\b/g) || []).length,
    fetchCallsToApi: (joined.match(/fetch\(\s*["'`]\/api\//g) || []).length,
    localStorageKeys: [...new Set((joined.match(/localStorage\.(?:get|set)Item\(\s*["'`]([^"'`]+)/g) || [])
      .map((m) => m.replace(/.*["'`]/, "")))],
    progressFields: (() => {
      const t = src("src/lib/store.ts");
      const m = t.match(/export interface Progress \{([\s\S]*?)\n\}/);
      return m ? (m[1].match(/^\s{2}\w+/gm) || []).length : 0;
    })(),
  };
})();

// ── migration surface: routes the app serves ──────────────────────────────
const ROUTING = (() => {
  const pages = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (e.name === "page.tsx") pages.push(rel.replace(/^src\/app/, "").replace(/\/page\.tsx$/, "") || "/");
    }
  };
  walk("src/app");
  const routesTs = src("src/lib/routes.ts");
  // The config is `.mjs`, not `.ts`. Resolved rather than hard-coded, because guessing
  // the extension is how this tool crashed on its first run — and a facts generator
  // that cannot read the config would have reported `staticExport: false` if the read
  // had been wrapped in a try/catch instead of throwing.
  const configFile = ["next.config.mjs", "next.config.ts", "next.config.js"].find(exists);
  if (!configFile) throw new Error("no next.config.* found — cannot measure the routing model");
  const config = src(configFile);
  return {
    configFile,
    pageRoutes: pages.length,
    pages: pages.sort(),
    routeIds: [...new Set((routesTs.match(/id: "([a-z-]+)"/g) || []).map((m) => m.replace(/.*"([a-z-]+)"/, "$1")))],
    // Matched at line start, not as `{ id: "A1"`: the declarations put the id on its own
    // line, so the braced pattern found nothing and reported `stageCount: 0`. A zero
    // from a regex that cannot match is indistinguishable from a zero that is true,
    // which is exactly why tests/facts.test.ts checks this against STAGES.length.
    stageCount: (routesTs.match(/^\s*id: "[AFS]\d",/gm) || []).length,
    hasRedirects: /redirects\s*:/.test(config),
    staticExport: /output:\s*["']export["']/.test(config),
    trailingSlash: /trailingSlash:\s*true/.test(config),
  };
})();

const facts = {
  generatedBy: "tools/gen-facts.cjs",
  note: "GENERATED. Every count in docs/transformation/*.md must come from here; tests/facts.test.ts enforces it.",
  content: {
    domains: curriculum.domains.length,
    levels: [...new Set(curriculum.domains.flatMap((d) => d.levels.map((l) => l.level)))].sort(),
    spineConcepts: SPINE.length,
    lessons: LESSONS.length,
    conceptLessons: CONCEPT_LESSONS.length,
    checkpoints: curriculum.checkpoints.length,
    checkpointItems: curriculum.checkpoints.reduce((a, c) => a + c.items.length, 0),
    midQuizItems: LESSONS.reduce((a, l) => a + (l.midQuiz?.length ?? 0), 0),
    checks: CHECKS.length,
    checksByKind: CHECKS.reduce((a, k) => ({ ...a, [k.kind]: (a[k.kind] || 0) + 1 }), {}),
    builds: BUILDS.length,
    codexEntries: CODEX_ENTRIES.length,
    codexClusters: codex.clusters.length,
    codexArchitectures: (codex.architectures ?? []).length,
    resources: (resources.resources ?? resources).length ?? 0,
    conceptsWithCode: CONCEPT_LESSONS.filter((c) => c.code).length,
    conceptsWithExample: CONCEPT_LESSONS.filter((c) => c.example).length,
    conceptsWithPitfalls: CONCEPT_LESSONS.filter((c) => c.pitfalls?.length).length,
    conceptsWithFlashcards: CONCEPT_LESSONS.filter((c) => c.flashcards?.length).length,
    conceptsWithPredict: CONCEPT_LESSONS.filter((c) => c.predict).length,
    leansOnEdges: SPINE.reduce((a, c) => a + (c.leansOn?.length ?? 0), 0),
    prerequisiteEdges: SPINE.reduce((a, c) => a + (c.prerequisites?.length ?? 0), 0),
  },
  i18n: i18nCount(),
  learningModel: { stages: Object.keys(STAGE_FIELDS).length, coverage: stageCoverage, totalConcepts: CONCEPT_LESSONS.length },
  a11y: A11Y,
  visual: VISUAL,
  validation: VALIDATION,
  analytics: ANALYTICS,
  routing: ROUTING,
  glossary: (() => {
    if (!exists("content/glossary.en.json")) return null;
    const g = JSON.parse(src("content/glossary.en.json"));
    return {
      terms: g.terms.length,
      kept: g.terms.filter((t) => !t.translate).length,
      localized: g.terms.filter((t) => t.translate).length,
      bans: g.terms.reduce((a, t) => a + t.avoid.length, 0),
      withNote: g.terms.filter((t) => t.note).length,
    };
  })(),
};

fs.writeFileSync(OUT, JSON.stringify(facts, null, 2) + "\n");
console.log(`docs/transformation/facts.json — ${Object.keys(facts).length} sections`);
console.log(`  content: ${facts.content.spineConcepts} concepts, ${facts.content.checks} checks, ${facts.content.codexEntries} Codex entries`);
console.log(`  i18n: ${facts.i18n.en} en / ${facts.i18n.es} es strings (${facts.i18n.emptyProse} empty prose, ${facts.i18n.emptyStructural} structural slots)`);
console.log(`  learning stages present: ${Object.entries(stageCoverage).filter(([, n]) => n > 0).length}/${Object.keys(STAGE_FIELDS).length}`);
console.log(`  validation: ${facts.validation.contentValidators} validators, ${facts.validation.unitTests} unit tests, ${facts.validation.e2eTests} e2e`);
console.log(`  analytics: ${facts.analytics.trackingCalls} tracking calls (zero is the honest answer)`);
