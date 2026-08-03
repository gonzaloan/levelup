#!/usr/bin/env node
/**
 * tools/inventories.cjs — the six machine-readable inventories the spec asks for.
 *
 * GENERATED, never hand-written. Same rule as `content-inventory.json`: the prompt
 * forbids invented quantities, so every figure in the transformation docs has to
 * trace to a command someone else can re-run. A hand-maintained inventory is a
 * document that is wrong within a month.
 *
 *   node tools/inventories.cjs             # write all six
 *   node tools/inventories.cjs --summary   # print the counts, write nothing
 *
 * Outputs, all under docs/transformation/:
 *   question-bank.json              every scored item, with what it assesses
 *   diagram-inventory.json          every figure, its type and its source format
 *   code-example-inventory.json     every snippet, its language and its claims
 *   aws-architecture-inventory.json every AWS-specific claim and where it is pinned
 *   content-review-schedule.json    freshness class + next review date per unit
 *   interview-bank.json             which existing items can serve an interview track
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "src", "content", "data");
const OUT = path.join(ROOT, "docs", "transformation");
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

const curriculum = read("curriculum.json");
const lessons = read("lessons.json").lessons;
const checks = read("checks.json").checks;
const codex = read("codex.json");
const builds = read("builds.json").builds;
const resources = read("resources.json").resources;

// ── Shared indexes ───────────────────────────────────────────────────────────
const SHARED_DOMAINS = new Set(["technical-depth", "systems-architecture", "cloud-platform"]);
const ROUTE_OF_DOMAIN = {
  "ai-engineering": "ai-architect",
  "cloud-platform": "shared-foundations",
  "systems-architecture": "shared-foundations",
  "technical-depth": "shared-foundations",
  "execution-delivery": "staff-engineer",
  "direction-influence": "staff-engineer",
  "leveling-scope": "staff-engineer",
};
const conceptCtx = new Map();
for (const d of curriculum.domains) {
  for (const lv of d.levels) {
    for (const c of lv.concepts) {
      conceptCtx.set(c.slug, { domainId: d.id, level: lv.level, route: ROUTE_OF_DOMAIN[d.id], concept: c });
    }
  }
}
const lessonConcept = new Map();
const lessonOf = new Map();
for (const l of lessons) {
  for (const c of l.concepts) { lessonConcept.set(c.slug, c); lessonOf.set(c.slug, l.lessonId); }
}
const ctxOf = (slug) => conceptCtx.get(slug) ?? { domainId: null, level: null, route: null, concept: null };
const words = (s) => (s ? String(s).trim().split(/\s+/).filter(Boolean).length : 0);

/**
 * Is this stem a judgment question or a definition question?
 *
 * Same discriminator as `tools/audit.cjs`: whether the stem carries SITUATIONAL
 * detail, not which interrogative it opens with. Duplicated deliberately rather than
 * shared — these two scripts are read independently, and a reader of this file should
 * be able to see the rule that produced the number.
 */
const DEFINITIONAL = /^(what is|what are|which of the following (best )?(describes|defines)|what does .{0,40} mean|the term .{0,30} refers to|define )/i;
const SITUATIONAL = [
  /\byour\b/i, /\byou\b/i, /\bteam\b/i, /\bservice\b/i, /\bsystem\b/i, /\d/,
  /\bafter\b/i, /\bduring\b/i, /\bp9[59]\b/i, /\bincident\b/i, /\bfails?\b/i,
  /\bslow\b/i, /\bbudget\b/i, /\bdeadline\b/i, /\bproduction\b/i, /\bcustomer\b/i,
  /\bstakeholder\b/i, /\bconstraint\b/i, /\btradeoff\b/i,
];
function stemKind(stem) {
  const s = String(stem || "");
  if (!s) return "empty";
  if (DEFINITIONAL.test(s.trim())) return "definition";
  const hits = SITUATIONAL.filter((re) => re.test(s)).length;
  return hits >= 2 ? "judgment" : hits === 1 ? "mixed" : "definition";
}

/**
 * Applies ONLY to a question. A check's `prompt` is an INSTRUCTION — "Sort each
 * failure by who acts on it", "Order the steps" — and running a
 * definition-vs-judgment heuristic over an instruction is a category error.
 *
 * The first run of this tool did exactly that and reported 290 "definition" items.
 * 273 of those were check prompts, so the number described the grammar of an
 * imperative rather than anything about the item. Checks get `n/a`: what they assess
 * is carried by `capabilityLevel`, which is derived from the MECHANIC.
 */
function stemKindFor(kind, stem) {
  if (kind !== "mcq") return "n/a-instruction";
  return stemKind(stem);
}

/** The practice/graded pool split, mirroring `poolFor` in src/lib/checks.ts. */
const checksByConcept = new Map();
for (const c of checks) {
  if (!checksByConcept.has(c.concept)) checksByConcept.set(c.concept, []);
  checksByConcept.get(c.concept).push(c);
}
function poolOf(check) {
  const all = checksByConcept.get(check.concept) ?? [];
  if (all.length <= 1) return "practice";
  return all.indexOf(check) % 2 === 0 ? "practice" : "graded";
}

// ── 1. question-bank.json ────────────────────────────────────────────────────
// Every SCORED item in the platform, with what it assesses and how it is reached.
const questionBank = [];
for (const cp of curriculum.checkpoints) {
  cp.items.forEach((item, idx) => {
    const ctx = ctxOf(item.concept);
    questionBank.push({
      id: `${cp.id}#${idx}`,
      kind: "mcq",
      surface: "checkpoint",
      scored: true,
      checkpointId: cp.id,
      concepts: [item.concept],
      domainId: cp.domainId,
      route: ROUTE_OF_DOMAIN[cp.domainId],
      level: cp.afterLevel,
      stemKind: stemKindFor("mcq", item.stem?.en),
      options: item.options.length,
      correctCount: item.options.filter((o) => o.correct).length,
      rationaleWords: item.options.map((o) => words(o.rationale?.en)),
      // A distractor with no misconception label is a distractor nobody can learn from.
      distractorsWithRationale: item.options.filter((o) => !o.correct && words(o.rationale?.en) >= 12).length,
      bilingual: !!(item.stem?.en && item.stem?.es),
      capabilityLevel: "decide",
      _lessonId: lessonOf.get(item.concept) ?? null,
      _stage: ctx.route ? { route: ctx.route, level: ctx.level } : null,
    });
  });
}
for (const l of lessons) {
  (l.midQuiz ?? []).forEach((item, idx) => {
    questionBank.push({
      id: `${l.lessonId}#midQuiz${idx}`,
      kind: "mcq",
      surface: "mid-lesson",
      scored: false, // MidQuiz is explicitly formative
      checkpointId: null,
      concepts: [],
      domainId: l.lessonId.replace(/-l\d$/, ""),
      route: ROUTE_OF_DOMAIN[l.lessonId.replace(/-l\d$/, "")] ?? null,
      level: (l.lessonId.match(/-l(\d)$/) || [])[1] ? `L${l.lessonId.slice(-1)}` : null,
      stemKind: stemKindFor("mcq", item.stem?.en),
      options: item.options.length,
      correctCount: item.options.filter((o) => o.correct).length,
      rationaleWords: item.options.map((o) => words(o.rationale?.en)),
      distractorsWithRationale: item.options.filter((o) => !o.correct && words(o.rationale?.en) >= 12).length,
      bilingual: !!(item.stem?.en && item.stem?.es),
      capabilityLevel: "recognize",
      _lessonId: l.lessonId,
      _stage: null,
    });
  });
}
for (const c of checks) {
  const ctx = ctxOf(c.concept);
  const pool = poolOf(c);
  questionBank.push({
    id: c.id,
    kind: c.kind,
    surface: pool === "graded" ? "checkpoint" : "practice",
    scored: pool === "graded",
    checkpointId: null,
    concepts: [c.concept],
    domainId: ctx.domainId,
    route: ctx.route,
    level: ctx.level,
    stemKind: stemKindFor(c.kind, c.prompt?.en),
    options: c.kind === "cloze" ? (c.bank ?? []).length
      : c.kind === "match" ? (c.right ?? []).length
      : c.kind === "categorize" ? (c.buckets ?? []).length
      : (c.items ?? []).length,
    correctCount: 1,
    rationaleWords: [words(c.explain?.en)],
    distractorsWithRationale: words(c.explain?.en) >= 12 ? 1 : 0,
    bilingual: !!(c.prompt?.en && c.prompt?.es),
    // The mechanic maps to a rung on the §33.4 practice progression.
    capabilityLevel: c.kind === "order" ? "diagnose" : c.kind === "categorize" ? "decide" : "recall",
    pool,
    _lessonId: lessonOf.get(c.concept) ?? null,
    _stage: ctx.route ? { route: ctx.route, level: ctx.level } : null,
  });
}
for (const b of builds) {
  const ctx = ctxOf(b.concept);
  questionBank.push({
    id: b.id,
    kind: "build",
    surface: "build-lab",
    scored: true,
    checkpointId: null,
    concepts: [b.concept],
    domainId: ctx.domainId,
    route: ctx.route,
    level: ctx.level,
    stemKind: stemKindFor("build", b.prompt?.en),
    options: (b.palette ?? []).length,
    correctCount: 1,
    rationaleWords: [words(b.explain?.en)],
    distractorsWithRationale: (b.forbiddenEdges ?? []).length,
    bilingual: !!(b.prompt?.en && b.prompt?.es),
    capabilityLevel: "design",
    _lessonId: lessonOf.get(b.concept) ?? null,
    _stage: ctx.route ? { route: ctx.route, level: ctx.level } : null,
  });
}

// ── 2. diagram-inventory.json ────────────────────────────────────────────────
const diagramInventory = [];
for (const l of lessons) {
  for (const c of l.concepts) {
    for (const field of ["diagram", "architecture"]) {
      const s = c[field];
      if (!s || s.kind === "none") continue;
      const ctx = ctxOf(c.slug);
      diagramInventory.push({
        id: `${c.slug}.${field}`,
        conceptSlug: c.slug,
        lessonId: l.lessonId,
        route: ctx.route,
        level: ctx.level,
        diagramType: s.kind,
        // Authored inline JSON rendered by src/components/Schematic.tsx — an editable
        // SOURCE, not an exported PNG, which is what section 36.5 asks for.
        sourceFormat: "authored-json",
        renderedBy: "src/components/Schematic.tsx",
        editable: true,
        nodes: (s.nodes ?? []).length,
        hasCaption: !!(s.caption?.en && s.caption?.es),
        // The caption IS the accessible name: Schematic sets role="img" + aria-label.
        accessibleName: !!s.caption?.en,
        bilingual: !!(s.caption?.en && s.caption?.es),
        purpose: field === "diagram" ? "explain the concept" : "show the system view",
      });
    }
    if (c.visual?.widgetId) {
      const ctx = ctxOf(c.slug);
      diagramInventory.push({
        id: `${c.slug}.visual`,
        conceptSlug: c.slug,
        lessonId: l.lessonId,
        route: ctx.route,
        level: ctx.level,
        diagramType: "interactive-widget",
        sourceFormat: "react-component",
        renderedBy: `src/components/viz (${c.visual.widgetId})`,
        editable: true,
        nodes: 0,
        hasCaption: true,
        accessibleName: true,
        bilingual: true,
        purpose: "explore parameters",
        widgetId: c.visual.widgetId,
        params: c.visual.params ?? null,
      });
    }
  }
}
for (const cl of codex.clusters) {
  for (const e of cl.entries) {
    if (!e.diagram || e.diagram.kind === "none") continue;
    diagramInventory.push({
      id: `codex:${e.slug}.diagram`,
      conceptSlug: null,
      codexSlug: e.slug,
      cluster: cl.slug,
      route: "shared-foundations",
      level: null,
      diagramType: e.diagram.kind,
      sourceFormat: "authored-json",
      renderedBy: "src/components/Schematic.tsx",
      editable: true,
      nodes: (e.diagram.nodes ?? []).length,
      hasCaption: !!(e.diagram.caption?.en && e.diagram.caption?.es),
      accessibleName: !!e.diagram.caption?.en,
      bilingual: !!(e.diagram.caption?.en && e.diagram.caption?.es),
      purpose: "explain the reference term",
    });
  }
}
for (const a of codex.architectures) {
  diagramInventory.push({
    id: `architecture:${a.slug}`,
    conceptSlug: null,
    route: "shared-foundations",
    level: null,
    diagramType: a.diagram?.kind ?? "none",
    sourceFormat: "authored-json",
    renderedBy: "src/components/Schematic.tsx",
    editable: true,
    nodes: (a.diagram?.nodes ?? []).length,
    hasCaption: !!a.diagram?.caption?.en,
    accessibleName: !!a.diagram?.caption?.en,
    bilingual: !!(a.diagram?.caption?.en && a.diagram?.caption?.es),
    purpose: "a real vendor reference shape",
    vendor: a.vendor,
    source: a.source,
  });
}

// ── 3. code-example-inventory.json ───────────────────────────────────────────
const codeInventory = [];
for (const l of lessons) {
  for (const c of l.concepts) {
    if (!c.code) continue;
    const ctx = ctxOf(c.slug);
    const snippet = c.code.snippet ?? "";
    codeInventory.push({
      id: `${c.slug}.code`,
      conceptSlug: c.slug,
      lessonId: l.lessonId,
      route: ctx.route,
      level: ctx.level,
      language: c.code.lang,
      lines: snippet.split("\n").length,
      annotations: (c.code.annotations ?? []).length,
      hasCaption: !!c.code.caption?.en,
      // §37.4: a snippet must declare a runtime, avoid secrets, validate input.
      declaresRuntime: /\b(python3?|node|v?\d+\.\d+|>=|package|import |from )\b/.test(snippet),
      mentionsSecret: /\b(sk-[a-zA-Z0-9]|AKIA[0-9A-Z]{16}|password\s*=\s*["'][^"']+)/.test(snippet),
      // Presented as executable vs illustrative — a real distinction §37.4 requires.
      style: /^\s*(#|\/\/)\s*pseudocode/im.test(snippet) ? "pseudocode" : "runnable-fragment",
      source: c.source ?? null,
      // The trace gate already verifies figures against the concept's own prose.
      verifiedBy: "tools/check-trace.cjs",
    });
  }
}

// ── 4. aws-architecture-inventory.json ───────────────────────────────────────
// Every AWS-specific claim, and whether the pinned-facts file covers it. The
// project's rule: anything that file marks UNVERIFIED is a mechanism, never asserted.
const AWS_FACTS = path.join(ROOT, "research", "2026-07-25-aws-verified-facts.md");
const factsText = fs.existsSync(AWS_FACTS) ? fs.readFileSync(AWS_FACTS, "utf8") : "";
const AWS_SERVICE = /\b(Lambda|DynamoDB|Aurora|S3|EC2|ECS|EKS|Fargate|SQS|SNS|EventBridge|API Gateway|CloudFront|Route ?53|IAM|KMS|CloudWatch|X-Ray|Bedrock|SageMaker|OpenSearch|Redshift|Athena|Glue|Step Functions|RDS|ElastiCache|Graviton|Savings Plans?|CUR|FOCUS|Security Hub|Config|Organizations|Control Tower|Transit Gateway|PrivateLink|VPC)\b/g;
const awsInventory = [];
function awsClaimsIn(text, ctx) {
  const services = [...new Set([...String(text || "").matchAll(AWS_SERVICE)].map((m) => m[1]))];
  if (!services.length) return;
  awsInventory.push({
    ...ctx,
    services,
    // A service named in the pinned-facts file has a checkable anchor.
    pinnedServices: services.filter((s) => factsText.includes(s)),
    unpinnedServices: services.filter((s) => !factsText.includes(s)),
    hasFigure: /\d/.test(String(text)),
    factsFile: fs.existsSync(AWS_FACTS) ? "research/2026-07-25-aws-verified-facts.md" : null,
  });
}
for (const l of lessons) {
  for (const c of l.concepts) {
    const ctx = ctxOf(c.slug);
    awsClaimsIn(
      [c.explanation?.en, c.depth?.en, c.example?.walkthrough?.en].filter(Boolean).join("\n"),
      { id: `${c.slug}`, kind: "spine-concept", conceptSlug: c.slug, lessonId: l.lessonId, route: ctx.route, level: ctx.level, source: c.source ?? null },
    );
  }
}
for (const a of codex.architectures) {
  awsClaimsIn(
    [a.problem?.en, a.whenThisShape?.en, ...(a.flow ?? []).map((f) => f.en), ...(a.components ?? []).map((x) => x.role?.en)].filter(Boolean).join("\n"),
    { id: `architecture:${a.slug}`, kind: "reference-architecture", vendor: a.vendor, route: "shared-foundations", level: null, source: a.source },
  );
}
for (const cl of codex.clusters) {
  for (const e of cl.entries) {
    awsClaimsIn(
      [e.howItWorks?.en, e.cost?.en, e.numbers?.en].filter(Boolean).join("\n"),
      { id: `codex:${e.slug}`, kind: "codex-entry", cluster: cl.slug, route: "shared-foundations", level: null, source: e.source },
    );
  }
}

// ── 5. content-review-schedule.json ──────────────────────────────────────────
// §14 freshness: Stable / Slowly changing / Fast changing / Research frontier, with
// a review interval per class. Classified from what the unit's claims DEPEND on —
// a vendor limit rots, an algorithm's complexity does not.
const FAST = /\b(pricing|price|per million|per-mtok|\$\d|context window|token limit|rate limit|quota|GA|preview|deprecat)/i;
const VENDOR = /\b(AWS|Azure|GCP|Anthropic|OpenAI|Bedrock|Claude|GPT|Gemini|Qdrant|Weaviate|Pinecone|vLLM)\b/;
const FRONTIER = /\b(agent|MCP|fine-tun|RAG|embedding|reranking|LLM|frontier model)\b/i;
const INTERVAL_DAYS = { stable: 730, "slowly-changing": 365, "fast-changing": 90, "research-frontier": 60 };
function freshnessOf(text, source) {
  const t = `${text || ""} ${source || ""}`;
  if (FAST.test(t)) return "fast-changing";
  if (VENDOR.test(t) && FRONTIER.test(t)) return "research-frontier";
  if (VENDOR.test(t)) return "slowly-changing";
  if (FRONTIER.test(t)) return "research-frontier";
  return "stable";
}
const reviewSchedule = [];
for (const l of lessons) {
  for (const c of l.concepts) {
    const ctx = ctxOf(c.slug);
    const text = [c.explanation?.en, c.depth?.en].filter(Boolean).join("\n");
    const cls = freshnessOf(text, c.source);
    reviewSchedule.push({
      id: `concept:${c.slug}`,
      kind: "spine-concept",
      route: ctx.route,
      level: ctx.level,
      lessonId: l.lessonId,
      freshness: cls,
      intervalDays: INTERVAL_DAYS[cls],
      // No last-reviewed date exists in the content model yet, so this states the
      // gap rather than inventing a date. Emitting a fabricated timestamp would make
      // the whole schedule untrustworthy.
      lastReviewed: null,
      nextReview: null,
      needsDateField: true,
      source: c.source ?? null,
    });
  }
}
for (const cl of codex.clusters) {
  for (const e of cl.entries) {
    const text = [e.howItWorks?.en, e.cost?.en, e.numbers?.en].filter(Boolean).join("\n");
    const cls = freshnessOf(text, e.source);
    reviewSchedule.push({
      id: `codex:${e.slug}`,
      kind: "codex-entry",
      route: "shared-foundations",
      level: null,
      cluster: cl.slug,
      freshness: cls,
      intervalDays: INTERVAL_DAYS[cls],
      lastReviewed: null,
      nextReview: null,
      needsDateField: true,
      source: e.source,
    });
  }
}
for (const r of resources) {
  const cls = freshnessOf(r.title, r.url);
  reviewSchedule.push({
    id: `resource:${r.id}`,
    kind: "reading-resource",
    route: ROUTE_OF_DOMAIN[r.domainId] ?? null,
    level: (r.levels ?? [])[0] ?? null,
    freshness: cls,
    intervalDays: INTERVAL_DAYS[cls],
    lastReviewed: null,
    nextReview: null,
    needsDateField: true,
    // Link liveness IS checked, by a different tool — worth recording which.
    linkVerifiedBy: "tools/check-links.mjs",
    source: r.url,
  });
}

// ── 6. interview-bank.json ───────────────────────────────────────────────────
// §35 asks for interview tracks fed by the SAME knowledge graph, not duplicated
// content. So this maps existing scored items onto the four tracks rather than
// inventing questions: the bank is a VIEW, and what it exposes is the gap.
const TRACKS = {
  "ai-architecture": { domains: ["ai-engineering"], route: "ai-architect" },
  "system-design": { domains: ["systems-architecture", "technical-depth"], route: "shared-foundations" },
  "aws-architecture": { domains: ["cloud-platform"], route: "shared-foundations" },
  "staff-engineer": { domains: ["execution-delivery", "direction-influence", "leveling-scope"], route: "staff-engineer" },
};
const interviewBank = [];
for (const [track, def] of Object.entries(TRACKS)) {
  const items = questionBank.filter((q) => def.domains.includes(q.domainId));
  // An MCQ qualifies when its stem is situated. A CHECK qualifies on its mechanic:
  // ordering a sequence or sorting into a decision boundary IS interview-shaped work,
  // and its prompt being an imperative says nothing either way.
  const judgment = items.filter((q) =>
    q.stemKind === "judgment" || (q.kind !== "mcq" && ["diagnose", "decide", "design"].includes(q.capabilityLevel)));
  interviewBank.push({
    track,
    route: def.route,
    domains: def.domains,
    // Only situated items can carry an interview: a definition question is not one.
    usableItems: judgment.length,
    totalItems: items.length,
    byCapability: judgment.reduce((m, q) => { m[q.capabilityLevel] = (m[q.capabilityLevel] || 0) + 1; return m; }, {}),
    itemIds: judgment.map((q) => q.id),
    // §35.2 requires clarify → frame → propose → deep dive → challenge → defend →
    // reflect, and §35.5 requires follow-ups and a rubric per question. Nothing in
    // the corpus has those, so the honest value is the gap, not a fabricated count.
    hasFollowUps: false,
    hasRubric: false,
    missing: [
      "follow-up questions per item (§35.5)",
      "an evaluation rubric with per-dimension evidence (§34.3)",
      "an interviewer that introduces constraints gradually (§35.3)",
      "a spoken-or-typed defence step (§35.2)",
    ],
  });
}

// ── Summary ──────────────────────────────────────────────────────────────────
const tally = (arr, key) => arr.reduce((m, x) => { const k = x[key] ?? "none"; m[k] = (m[k] || 0) + 1; return m; }, {});
const summary = {
  generated_by: "tools/inventories.cjs",
  question_bank: {
    total: questionBank.length,
    scored: questionBank.filter((q) => q.scored).length,
    by_surface: tally(questionBank, "surface"),
    by_kind: tally(questionBank, "kind"),
    by_route: tally(questionBank, "route"),
    by_stem_kind: tally(questionBank, "stemKind"),
    by_capability: tally(questionBank, "capabilityLevel"),
    items_whose_every_distractor_teaches: questionBank.filter((q) =>
      q.kind === "mcq" && q.distractorsWithRationale === q.options - q.correctCount).length,
  },
  diagram_inventory: {
    total: diagramInventory.length,
    by_type: tally(diagramInventory, "diagramType"),
    by_source_format: tally(diagramInventory, "sourceFormat"),
    editable: diagramInventory.filter((d) => d.editable).length,
    with_accessible_name: diagramInventory.filter((d) => d.accessibleName).length,
    bilingual_caption: diagramInventory.filter((d) => d.bilingual).length,
  },
  code_example_inventory: {
    total: codeInventory.length,
    by_language: tally(codeInventory, "language"),
    by_style: tally(codeInventory, "style"),
    declares_runtime: codeInventory.filter((c) => c.declaresRuntime).length,
    mentions_secret: codeInventory.filter((c) => c.mentionsSecret).length,
    with_annotations: codeInventory.filter((c) => c.annotations > 0).length,
  },
  aws_architecture_inventory: {
    units_making_an_aws_claim: awsInventory.length,
    by_kind: tally(awsInventory, "kind"),
    services_named: [...new Set(awsInventory.flatMap((a) => a.services))].sort(),
    units_with_an_unpinned_service: awsInventory.filter((a) => a.unpinnedServices.length > 0).length,
  },
  content_review_schedule: {
    total: reviewSchedule.length,
    by_freshness: tally(reviewSchedule, "freshness"),
    units_needing_a_last_reviewed_field: reviewSchedule.filter((r) => r.needsDateField).length,
  },
  interview_bank: {
    tracks: interviewBank.length,
    usable_items: interviewBank.reduce((a, t) => a + t.usableItems, 0),
    total_items_considered: interviewBank.reduce((a, t) => a + t.totalItems, 0),
    tracks_with_rubrics: interviewBank.filter((t) => t.hasRubric).length,
  },
};

if (process.argv.includes("--summary")) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
const strip = (arr) => arr.map((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith("_"))));
const write = (name, payload) => {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(payload, null, 1));
  console.log(`  ${name}`);
};
console.log("writing:");
write("question-bank.json", { summary: summary.question_bank, generated_by: summary.generated_by, items: strip(questionBank) });
write("diagram-inventory.json", { summary: summary.diagram_inventory, generated_by: summary.generated_by, diagrams: diagramInventory });
write("code-example-inventory.json", { summary: summary.code_example_inventory, generated_by: summary.generated_by, examples: codeInventory });
write("aws-architecture-inventory.json", { summary: summary.aws_architecture_inventory, generated_by: summary.generated_by, claims: awsInventory });
write("content-review-schedule.json", { summary: summary.content_review_schedule, generated_by: summary.generated_by, units: reviewSchedule });
write("interview-bank.json", { summary: summary.interview_bank, generated_by: summary.generated_by, tracks: interviewBank });
console.log(`\n${JSON.stringify(summary, null, 1)}`);
