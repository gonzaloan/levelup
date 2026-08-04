#!/usr/bin/env node
/**
 * Does check-static.cjs catch what it claims to?
 *
 * The gate exists because "static, no LLM" is an architectural constraint that three
 * documents reason from. A gate nobody attacks is a gate nobody should trust — four of this
 * project's own rules were wrong when first measured.
 *
 * Each case introduces ONE violation, runs the real checker, and restores. The last group is
 * the more important half: correct content that must NOT fail, because a gate that fires on
 * valid code gets deleted by the next person who hits it.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const PKG = path.join(ROOT, "package.json");
const CFG = path.join(ROOT, "next.config.mjs");
const PROBE = path.join(ROOT, "src", "lib", "_probe.ts");
const API = path.join(ROOT, "src", "app", "api");

const originals = { [PKG]: fs.readFileSync(PKG, "utf8"), [CFG]: fs.readFileSync(CFG, "utf8") };
function restore() {
  for (const [f, t] of Object.entries(originals)) fs.writeFileSync(f, t);
  if (fs.existsSync(PROBE)) fs.unlinkSync(PROBE);
  if (fs.existsSync(API)) fs.rmSync(API, { recursive: true, force: true });
}

function run() {
  try {
    execFileSync(process.execPath, [path.join(__dirname, "check-static.cjs")], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out: "" };
  } catch (e) { return { ok: false, out: `${e.stdout || ""}${e.stderr || ""}` }; }
}

let pass = 0;
const failures = [];

function rejects(name, mutate, expect) {
  restore();
  mutate();
  const { ok, out } = run();
  if (ok) failures.push(`${name}: the gate PASSED on a violation`);
  else if (expect && !out.includes(expect)) {
    failures.push(`${name}: failed for the wrong reason — wanted "${expect}", got: ${out.split("\n").find((l) => l.includes("✗")) || out.slice(0, 120)}`);
  } else pass++;
  restore();
}

function accepts(name, mutate) {
  restore();
  mutate();
  const { ok, out } = run();
  if (!ok) failures.push(`${name}: the gate REJECTED valid code — ${out.split("\n").find((l) => l.includes("✗")) || ""}`);
  else pass++;
  restore();
}

const probe = (body) => fs.writeFileSync(PROBE, body);

// ── the constraint the owner set ─────────────────────────────────────────
rejects("a model SDK in dependencies", () => {
  const p = JSON.parse(originals[PKG]);
  p.dependencies.openai = "^4.0.0";
  fs.writeFileSync(PKG, JSON.stringify(p, null, 2) + "\n");
}, "model SDK");

rejects("an Anthropic SDK", () => {
  const p = JSON.parse(originals[PKG]);
  p.dependencies["@anthropic-ai/sdk"] = "^0.30.0";
  fs.writeFileSync(PKG, JSON.stringify(p, null, 2) + "\n");
}, "model SDK");

rejects("an API route directory", () => {
  fs.mkdirSync(API, { recursive: true });
  fs.writeFileSync(path.join(API, "route.ts"), "export async function GET() { return new Response('x'); }\n");
}, "src/app/api exists");

rejects("a server action", () => probe(`"use server";\nexport async function act() { return 1; }\n`), "use server");
rejects("a runtime export", () => probe(`export const runtime = "edge";\n`), "runtime");
rejects("force-dynamic", () => probe(`export const dynamic = "force-dynamic";\n`), "force-dynamic");

// ── no network after load ────────────────────────────────────────────────
rejects("a fetch()", () => probe(`export const go = () => fetch("https://example.com");\n`), "fetch()");
rejects("an XMLHttpRequest", () => probe(`export const go = () => new XMLHttpRequest();\n`), "XMLHttpRequest");
rejects("a WebSocket", () => probe(`export const go = () => new WebSocket("wss://x");\n`), "WebSocket");
rejects("sendBeacon", () => probe(`export const go = () => navigator.sendBeacon("/x");\n`), "sendBeacon");

// ── a static bundle is public ────────────────────────────────────────────
rejects("an OpenAI-style key", () => probe(`export const K = "sk-abcdefghij0123456789";\n`), "public");
rejects("an AWS access key id", () => probe(`export const K = "AKIAIOSFODNN7EXAMPLE";\n`), "public");
rejects("a hardcoded bearer token", () => probe(`export const H = "Bearer abcdefghijklmnopqrstuvwx";\n`), "public");
rejects("a non-public env var", () => probe(`export const K = process.env.SECRET_TOKEN;\n`), "undefined in a static export");

// ── the export config itself ─────────────────────────────────────────────
rejects("output: export removed", () => {
  fs.writeFileSync(CFG, originals[CFG].replace(/output:\s*["']export["'],?/, ""));
}, 'output: "export" is missing');

// ── determinism, which is what makes a static render safe ────────────────
rejects("Math.random() in a rendered module", () => probe(`export const pick = () => Math.random();\n`), "hydration parity");

// ── CORRECT CODE MUST BE ACCEPTED ────────────────────────────────────────
// Each of these would trip a lazier rule, and each is real content or real code in the repo.
accepts("the repo exactly as it ships", () => {});

accepts("a vendor NAME in content", () =>
  // `anthropic` and `openai` appear as vendor labels on Codex architecture cards. A rule
  // grepping for vendor names would fire on correct content — the mistake this project made
  // four times with Spanish calques.
  probe(`export const VENDORS = { anthropic: "Anthropic", openai: "OpenAI" } as const;\n`));

accepts("prose about tokens and keys", () =>
  // The corpus teaches about tokens, API keys and bearer auth constantly. Only literals that
  // LOOK like a credential are rejected, not the words.
  probe(`export const T = { en: "A valid token proves you logged in, nothing more.", es: "Un token válido prueba que iniciaste sesión." };\n`));

accepts("NEXT_PUBLIC_ env vars", () => probe(`export const B = process.env.NEXT_PUBLIC_BASE_PATH;\n`));
accepts("NODE_ENV", () => probe(`export const DEV = process.env.NODE_ENV !== "production";\n`));

accepts("the word fetch inside a string", () =>
  probe(`export const S = { en: "Retrieval fetches candidate passages.", es: "La recuperación trae pasajes." };\n`));

restore();
const total = pass + failures.length;
for (const f of failures) console.error(`FAIL  ${f}`);
console.log(`\nselftest-static: ${pass}/${total} checks pass`);
if (failures.length) process.exit(1);
