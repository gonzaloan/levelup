// Let a challenge DECLARE a distractor, so the warning means something.
//
// merge-builds.cjs warns whenever a palette type appears in no criterion. Three do, all
// deliberately: a learner has to decide not to reach for the system prompt, and removing
// the option removes the decision.
//
// But an unconditional warning cannot tell an intentional distractor from a type someone
// forgot to wire, so after three of them it is noise — and noise is how the fourth, which
// WOULD be a bug, gets scrolled past. A `decoy: true` flag on the palette entry makes the
// author state the intent, and the validator then warns only about the ones nobody claimed.
//
// It also earns its keep: a decoy must carry a `hint`, because a distractor a learner cannot
// reason about before grading is a trap rather than a decision.
const fs = require("node:fs");

// ── 1. the validator ─────────────────────────────────────────────────────
{
  const p = "tools/merge-builds.cjs";
  let s = fs.readFileSync(p, "utf8");
  const old = `  for (const t of types) {
    if (!referenced.has(t)) warns.push(\`\${where}: palette type "\${t}" appears in no criterion (decoy)\`);
  }`;
  const New = `  // A palette type in no criterion is either a declared distractor or a wiring mistake,
  // and an unconditional warning cannot tell them apart. Three are deliberate here, so the
  // warning had become noise — which is how the fourth, a real bug, would get scrolled
  // past. \`decoy: true\` makes the author say so.
  for (const [i, entry] of b.palette.entries()) {
    const orphan = !referenced.has(entry.type);
    if (orphan && !entry.decoy) {
      warns.push(\`\${where}: palette type "\${entry.type}" appears in no criterion — \` +
                 \`mark it \\\`decoy: true\\\` if that is deliberate\`);
    }
    if (!orphan && entry.decoy) {
      // Contradiction, and worth an error: a criterion depends on it, so a learner who
      // treats the hint as "do not use this" is penalised for reading it.
      bad(\`\${where}.palette[\${i}]: "\${entry.type}" is marked decoy but a criterion requires it\`);
    }
    if (entry.decoy && !entry.hint) {
      // A distractor a learner cannot reason about before grading is a trap.
      bad(\`\${where}.palette[\${i}]: decoy "\${entry.type}" needs a hint saying what it does not buy\`);
    }
  }`;
  if (!s.includes(old)) { console.error("!! validator anchor not found"); process.exit(1); }
  fs.writeFileSync(p, s.replace(old, New));
  console.log("patched merge-builds.cjs");
}

// ── 2. the schema ────────────────────────────────────────────────────────
{
  const p = "src/lib/types.ts";
  let s = fs.readFileSync(p, "utf8");
  const old = `export interface BuildPaletteItem {
  type: string;                // stable id, e.g. "client", "lb", "cache", "db"
  label: I18nText;             // display name
  glyph?: string;              // optional short symbol/emoji-free tag for the node
  hint?: I18nText;             // what this component is for
}`;
  const New = `export interface BuildPaletteItem {
  type: string;                // stable id, e.g. "client", "lb", "cache", "db"
  label: I18nText;             // display name
  glyph?: string;              // optional short symbol/emoji-free tag for the node
  hint?: I18nText;             // what this component is for
  /**
   * A deliberate distractor: no criterion mentions it, and placing it costs nothing.
   *
   * Declared rather than inferred, because merge-builds.cjs warns about any palette type
   * in no criterion and could not tell an intended distractor from a wiring mistake. With
   * three deliberate ones the warning was noise, which is how a real orphan gets missed.
   *
   * A decoy MUST carry a \`hint\` saying what it does not buy — a distractor a learner
   * cannot reason about before grading is a trap, not a decision. And it must not be
   * required by any criterion, or reading the hint costs marks.
   */
  decoy?: boolean;
}`;
  if (!s.includes(old)) { console.error("!! schema anchor not found"); process.exit(1); }
  fs.writeFileSync(p, s.replace(old, New));
  console.log("patched types.ts");
}

// ── 3. the three declared decoys ─────────────────────────────────────────
{
  const p = "src/content/data/builds.json";
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  const list = data.builds ?? data;
  for (const [id, type] of [
    ["build-agent-tool-guardrail", "sysprompt"],
    ["build-ai-gateway", "promptrule"],
    ["build-async-queue", "db"],
  ]) {
    const item = list.find((b) => b.id === id)?.palette.find((x) => x.type === type);
    if (!item) { console.error(`!! ${id}/${type}`); continue; }
    item.decoy = true;
  }
  fs.writeFileSync(p, JSON.stringify(data));
  console.log("marked 3 declared decoys");
}
