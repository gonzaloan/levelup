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
/**
 * A newline as a binding, not an escape.
 *
 * Fourth occurrence of escape corruption in this project: a two-char sequence written
 * through a shell heredoc arrives as the raw control character, and inside a regex that
 * is a syntax error, while inside a filter it silently became a no-op that reported 12
 * validators where 11 exist. Bindings cannot be mangled.
 */
const NL = String.fromCharCode(10);

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
  // A concept is covered for Transfer when an item applies it in a domain it is not
  // taught in. The `transferTo` field is what makes this measurable: six such items
  // existed in checks.json before the field did, and this generator correctly reported
  // 0, because nothing distinguished them from an ordinary check.
  transfer: (c) => CHECKS.some((k) => k.concept === c.slug && k.transferTo),
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
  /**
   * Ask the runners, rather than counting call sites.
   *
   * Two regexes were wrong here in sequence. The first matched only `it(` and reported
   * 0 of the Playwright tests, because Playwright uses `test(`. The fix matched both and
   * was STILL wrong: a test generated inside a `for` loop has one call site and many
   * tests, so 6 spec files undercounted and the total read 89 against a real 110 — and
   * the sweep I wrote myself, `for (const lesson of AI_LESSONS)`, was one of them.
   *
   * A regex over source can only ever count call sites. `--list` counts tests, so the
   * number now comes from the tool that owns the answer. Falls back to the call-site
   * count if the runner is unavailable, and records which method produced the figure so
   * a doc cannot quietly quote an estimate as a measurement.
   */
  const listCount = (cmd, args, re) => {
    try {
      const out = execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32" });
      const m = out.match(re);
      return m ? Number(m[1]) : null;
    } catch { return null; }
  };
  const callSites = (files) =>
    files.reduce((a, f) => a + (src(f).match(/^\s*(?:it|test)\(/gm) || []).length, 0);
  const baselines = fs.readdirSync(__dirname).filter((f) => /baseline/.test(f));
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const e2eListed = listCount(npx, ["playwright", "test", "--list"], /Total:\s+(\d+)\s+tests?/);
  // `vitest list` prints one line per test; count the lines that name a file.
  const unitListed = (() => {
    try {
      const out = execFileSync(npx, ["vitest", "list"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32" });
      const n = out.split(NL).filter((l) => /^tests\/.+ > /.test(l.trim())).length;
      return n > 0 ? n : null;
    } catch { return null; }
  })();
  // A `gen-*` step in the chain is a GENERATOR, not a validator. `content:check` runs
  // gen-glossary.cjs immediately before check-glossary.cjs so the measured usage counts
  // cannot be stale — but counting it as a validator overstates the gate count by one,
  // and "12 content validators" would have gone into STATUS.md and validation-report.md
  // as evidence. Both numbers are reported, because the length of the chain is also a
  // fact worth having.
  const contentSteps = chain("content:check");
  return {
    contentValidators: contentSteps.filter((s) => !s.includes("/gen-")).length,
    contentCheckSteps: contentSteps.length,
    selfTests: chain("gates:selftest").length,
    verifySteps: chain("verify").length,
    unitTestFiles: unit.length,
    unitTests: unitListed ?? callSites(unit),
    unitTestsFrom: unitListed !== null ? "vitest list" : "call sites (runner unavailable)",
    e2eSpecFiles: e2e.length,
    e2eTests: e2eListed ?? callSites(e2e),
    e2eTestsFrom: e2eListed !== null ? "playwright --list" : "call sites (runner unavailable)",
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
    /**
     * Every localStorage key, including ones passed as a constant.
     *
     * The literal-only version found exactly one key — `levelup.theme`, from an inline
     * boot script — and MISSED `levelup.v1`, which is where all progress lives, because
     * `store.ts` writes `setItem(KEY, …)`. analytics-plan.md then read "a single
     * localStorage key (`levelup.theme`) plus the theme key", naming the theme store as
     * the progress store and repeating itself. It was the one sentence in that document a
     * reader would use to find their own data.
     *
     * So string constants that look like a key are resolved too, and the result is
     * sorted for stability.
     */
    localStorageKeys: (() => {
      const literals = (joined.match(/localStorage\.(?:get|set)Item\(\s*["'`]([^"'`]+)/g) || [])
        .map((m) => m.replace(/.*["'`]/, ""));
      // `const KEY = "levelup.v1";` and friends — a key held in a constant is still a key.
      const consts = (joined.match(/\b(?:const|let)\s+\w*KEY\w*\s*=\s*["'`]([^"'`]+)["'`]/g) || [])
        .map((m) => m.replace(/.*["'`]([^"'`]+)["'`]/, "$1"));
      return [...new Set([...literals, ...consts])].sort();
    })(),
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

/**
 * The engagement / retention / evaluation systems section 33-38 specify, measured
 * against what the source actually implements.
 *
 * The temptation in these docs is to describe the SPEC and let the reader assume it
 * shipped. So each capability below resolves to a boolean derived from the source, and
 * the docs print "absent" where the answer is false. `savedContent` is the clearest
 * case: section 33.1 defines a nine-field `saved_item` schema, and grep for it across
 * src/ returns nothing.
 */
const SYSTEMS = (() => {
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
  const review = src("src/lib/review.ts");
  const daily = src("src/lib/daily.ts");
  const scoring = src("src/lib/scoring.ts");

  // Section 33.2 names eight inputs an adaptive queue should combine.
  //
  // Each predicate below asks whether the SCHEDULER reads that signal, which is not the
  // same as whether the signal exists anywhere. Two of these were wrong on the first
  // pass and both errors flattered the implementation:
  //
  //   - "weak prerequisites" matched /prerequisite/ in daily.ts, which is there because
  //     the brief refuses to serve a concept whose prerequisites are unread. That gates
  //     what comes NEXT; it does not surface a shaky prerequisite for review. Different
  //     mechanism, opposite direction.
  //   - "unreviewed for too long" reused the same `dueConcepts` probe as "concepts near
  //     forgetting", so one implemented feature counted as two. It is the same ladder.
  //
  // Both now resolve to false, which drops the honest score from 3/8 to 1/8.
  const queueSources = {
    "concepts near forgetting": /dueConcepts/.test(daily),
    "recent mistakes": /responseLog/.test(daily),
    // These two were the SAME expression, so one feature would have counted twice — the
    // defect the dueConcepts note above says was fixed. Each now names the distinct
    // signal it needs: a low-confidence CORRECT answer and a high-confidence WRONG one
    // are different queries over responseLog, and a scheduler can read one without the
    // other.
    "correct but low confidence": /lowConfidenceCorrect|confidence.*correct/.test(daily + review),
    "wrong but high confidence": /confidentWrong|highConfidenceWrong/.test(daily + review),
    "saved concepts": /saved/i.test(daily),
    // Would require reading past wrong answers per prerequisite slug, not gating on read.
    "weak prerequisites": /prerequisiteStrength|weakPrereq/.test(daily),
    "knowledge the active module needs": /moduleId/.test(daily),
    // A distinct signal from the interval ladder: last-seen age regardless of schedule.
    "unreviewed for too long": /lastSeen|staleAfter/.test(daily),
    // Sources 9 and 10. My first reading of section 33.2 stopped at eight, which made the
    // shortfall look 20% smaller than it is and dropped two requirements from
    // review-queue-model.md's target table entirely. Source 9 is newly relevant: Transfer
    // items now exist, so a failed transfer is a signal the platform could record.
    "transfer failures": /transferTo/.test(daily + review),
    "interview weaknesses": /interview/i.test(daily + review),
  };

  return {
    spacedReview: {
      exists: fs.existsSync(path.join(ROOT, "src/lib/review.ts")),
      intervals: (review.match(/export const INTERVALS = \[([^\]]+)\]/) || [, ""])[1]
        .split(",").map((s) => s.trim()).filter(Boolean),
      grades: (review.match(/export type Grade =([^;]+);/) || [, ""])[1]
        .split("|").map((s) => s.trim().replace(/"/g, "")).filter(Boolean),
      easeRange: [
        (review.match(/EASE_MIN = ([\d.]+)/) || [, "?"])[1],
        (review.match(/EASE_MAX = ([\d.]+)/) || [, "?"])[1],
      ],
      pure: /PURE module: no Date, no randomness/.test(review),
    },
    reviewQueue: {
      dailyCap: Number((daily.match(/REVIEW_CAP = (\d+)/) || [, 0])[1]),
      sourcesImplemented: Object.values(queueSources).filter(Boolean).length,
      sourcesSpecified: Object.keys(queueSources).length,
      sources: queueSources,
    },
    confidence: {
      // Captured on assessment items, and used for the confident-wrong band cap and the
      // calibration gap — but NOT read by the review scheduler.
      captured: /confidence: Confidence/.test(src("src/lib/types.ts")),
      usedForBandCap: /confidence === "high"/.test(scoring),
      usedForCalibrationGap: /calibrationGap/.test(scoring),
      usedByReviewQueue: /confidence/.test(review) || /confidence/.test(daily),
      onChecks: /confidence/.test(src("src/components/checks/CheckHost.tsx")),
    },
    savedContent: {
      // Section 33.1. Absent entirely.
      exists: /saved_item|savedItems|SavedItem|bookmarks?\b/.test(joined),
      objectTypesSpecified: 10,
    },
    interviewMode: {
      // Section 35. A view over existing items exists as a generated inventory; the
      // product surface does not.
      inventoryExists: exists("docs/transformation/interview-bank.json"),
      routeExists: /interview/i.test(joined),
      tracks: exists("docs/transformation/interview-bank.json")
        ? JSON.parse(src("docs/transformation/interview-bank.json")).tracks.length : 0,
    },
    streak: {
      forgiving: /loss aversion/.test(daily),
      exists: /export function markDay/.test(daily),
    },
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
  systems: SYSTEMS,
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
