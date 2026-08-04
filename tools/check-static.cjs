#!/usr/bin/env node
/**
 * The platform stays STATIC and model-free. Enforced, not promised.
 *
 * WHY THIS EXISTS
 * The owner's constraint: a static export, no LLM anywhere in the web app, and simplicity
 * over capability. Three documents already rest on that — analytics-plan.md, migration-map.md
 * and target-learning-model.md all reason from "0 API routes" — and a constraint that only
 * lives in prose is one refactor away from being false.
 *
 * Every rule below is something a well-meaning change could break in an afternoon:
 * installing an SDK to "just try" a feature, adding one API route for a form, marking a
 * component `use server` to fix a hydration warning. Each of those quietly ends the static
 * deployment, and the failure would surface at deploy time or, worse, as a leaked key.
 *
 * WHAT IS NOT CHECKED, DELIBERATELY
 * The word "anthropic" appears in src/ twice, as a vendor label on a Codex architecture card.
 * That is CONTENT about who published a reference architecture, not a call to anyone. A rule
 * that grepped for vendor names would fire on correct content — the exact failure this repo
 * has hit four times (`rendimiento` banned as a calque of throughput, `límite` as a calque of
 * guardrail). So the rules below match imports, network calls and runtime directives: things
 * that only appear when code actually talks to something.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const errors = [];
const notes = [];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/** Every .ts/.tsx under src/, with comments stripped. */
function sources() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(e.name)) {
        // Comments are stripped because a rule that scans raw source flags its own
        // documentation — this project has made that mistake twice.
        const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
        out.push({ rel, code: raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "") });
      }
    }
  };
  walk("src");
  return out;
}

const files = sources();
const joined = files.map((f) => f.code).join("\n");

// ── 1. no model SDK may be a dependency ──────────────────────────────────
{
  const pkg = JSON.parse(read("package.json"));
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  const MODEL_PKG = /^(openai|@anthropic-ai\/|@ai-sdk\/|ai$|langchain|@langchain\/|cohere|replicate|@huggingface\/|@google\/generative-ai|@mistralai\/|groq-sdk|ollama)/i;
  const found = Object.keys(all).filter((k) => MODEL_PKG.test(k));
  if (found.length) {
    errors.push(`package.json depends on a model SDK: ${found.join(", ")}. The web app must not call a model.`);
  }
  notes.push(`${Object.keys(all).length} dependencies, 0 model SDKs`);
}

// ── 2. no API route, no server component, no server action ───────────────
{
  if (exists("src/app/api")) {
    errors.push(`src/app/api exists. A static export has no server — see analytics-plan.md.`);
  }
  for (const { rel, code } of files) {
    if (/^\s*["']use server["']/m.test(code)) errors.push(`${rel}: "use server" — a static export cannot run server actions.`);
    if (/export\s+const\s+runtime\s*=/.test(code)) errors.push(`${rel}: exports a \`runtime\`, which only applies to a server.`);
    if (/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(code)) {
      errors.push(`${rel}: force-dynamic defeats the static export.`);
    }
  }
}

// ── 3. no outbound network call at all ───────────────────────────────────
// The platform is offline after load: progress is localStorage, content is bundled. A fetch
// would mean either a backend or a third party, and both end the model.
{
  const NET = [
    [/\bfetch\s*\(/g, "fetch()"],
    [/new\s+XMLHttpRequest\b/g, "XMLHttpRequest"],
    [/new\s+WebSocket\b/g, "WebSocket"],
    [/new\s+EventSource\b/g, "EventSource"],
    [/navigator\.sendBeacon\b/g, "sendBeacon"],
  ];
  for (const { rel, code } of files) {
    for (const [re, name] of NET) {
      if (re.test(code)) errors.push(`${rel}: uses ${name}. The app makes no network calls after load.`);
    }
  }
}

// ── 4. no credential-shaped literal ──────────────────────────────────────
// A static bundle is public, so anything that looks like a key IS leaked. Matches literals
// only, not the words "key" or "token" — the corpus teaches about tokens constantly.
{
  const SECRET = [
    [/\bsk-[A-Za-z0-9_-]{16,}/g, "an OpenAI-style key"],
    [/\bsk-ant-[A-Za-z0-9_-]{16,}/g, "an Anthropic-style key"],
    [/\bAKIA[0-9A-Z]{16}\b/g, "an AWS access key id"],
    [/\bghp_[A-Za-z0-9]{20,}/g, "a GitHub token"],
    [/\bBearer\s+[A-Za-z0-9._-]{20,}/g, "a hardcoded bearer token"],
  ];
  for (const { rel, code } of files) {
    for (const [re, what] of SECRET) {
      if (re.test(code)) errors.push(`${rel}: contains ${what}. A static bundle is public.`);
    }
  }
  // Only NEXT_PUBLIC_* env vars can exist in a static export; anything else is a silent
  // undefined at runtime, which is how a feature "works locally" and breaks in production.
  for (const { rel, code } of files) {
    for (const m of code.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      if (!m[1].startsWith("NEXT_PUBLIC_") && m[1] !== "NODE_ENV") {
        errors.push(`${rel}: reads process.env.${m[1]}, which is undefined in a static export.`);
      }
    }
  }
}

// ── 5. the export config must still say so ───────────────────────────────
{
  const cfg = ["next.config.mjs", "next.config.ts", "next.config.js"].find(exists);
  if (!cfg) errors.push("no next.config.* found — cannot confirm the static export.");
  else {
    const c = read(cfg);
    if (!/output:\s*["']export["']/.test(c)) errors.push(`${cfg}: output: "export" is missing. The deployment assumes a static site.`);
    notes.push(`${cfg}: output: "export"`);
  }
}

// ── 6. determinism, which is what makes a static render safe ─────────────
// `Date.now()` or `Math.random()` in a rendered path produces different HTML on the server
// and the client, so hydration diverges. This is why review.ts is a pure module.
{
  for (const { rel, code } of files) {
    if (!/^src\/(lib|components)\//.test(rel)) continue;
    if (/\bMath\.random\s*\(/.test(code)) {
      errors.push(`${rel}: Math.random() breaks hydration parity — use the seeded shuffle in src/lib/shuffle.ts.`);
    }
  }
}

for (const n of notes) console.log(`  ${n}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`✓ static and model-free: ${files.length} source files, no SDK, no API route, no network call`);
