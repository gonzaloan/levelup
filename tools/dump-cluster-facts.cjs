#!/usr/bin/env node
/**
 * tools/dump-cluster-facts.cjs — per-cluster authoring input for the primer pass.
 *
 * A primer author needs three things: the cluster's entry slugs (its families must
 * be a TOTAL partition of them), each entry's definition and cost (so the primer
 * can sit at the level above without restating one), and the figures the entries
 * already state (so `whyItExists` cites a real number rather than inventing one —
 * PRIMER-CONTRACT.md rule 3).
 *
 * Handing an agent the whole 846KB codex.json instead makes it read past its
 * budget and paraphrase from memory, which is exactly how a fabricated figure gets
 * in. This writes one small file per cluster.
 *
 *   node tools/dump-cluster-facts.cjs            # → research/primers/facts/*.md
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const CODEX = path.join(ROOT, "src/content/data/codex.json");
const OUT = path.join(ROOT, "research/primers/facts");

/** Figures an entry states, with enough context to tell what each one measures. */
function figures(text) {
  if (!text) return [];
  // A number with its unit and a few words either side. Deliberately generous:
  // the author needs to SEE the claim, and a bare "1536" is not a citable figure.
  return [...text.matchAll(/[^.;]*?\b\d[\d,.]*\s*(?:%|x\b|ms\b|s\b|GB\b|MB\b|KB\b|k\b|M\b|B\b|tokens?|dimensions?|chunks?|characters?|pages?|queries|vectors?|times)?[^.;]*/g)]
    .map((m) => m[0].trim())
    .filter((s) => /\d/.test(s) && s.length > 12 && s.length < 220);
}

const codex = JSON.parse(fs.readFileSync(CODEX, "utf8"));
fs.mkdirSync(OUT, { recursive: true });

for (const c of codex.clusters) {
  const lines = [];
  lines.push(`# Cluster: ${c.slug} — "${c.title.en}"`);
  lines.push("");
  lines.push(`Current tagline (EN): ${c.tagline.en}`);
  lines.push(`Current tagline (ES): ${c.tagline.es}`);
  lines.push("");
  lines.push(`## The ${c.entries.length} entry slugs — your families MUST partition exactly these`);
  lines.push("");
  for (const e of c.entries) lines.push(`- \`${e.slug}\``);
  lines.push("");
  lines.push("## Each entry, so your primer sits ABOVE them and never restates one");
  lines.push("");
  for (const e of c.entries) {
    lines.push(`### \`${e.slug}\` — ${e.term.en}`);
    lines.push(`- **is:** ${e.definition.en}`);
    lines.push(`- **when:** ${e.whenToUse.en}`);
    lines.push(`- **costs:** ${e.cost.en}`);
    lines.push(`- **cheaper first:** ${e.cheaperFirst.en}`);
    if (e.prerequisites?.length) lines.push(`- **needs first:** ${e.prerequisites.join(", ")}`);
    const figs = [
      ...figures(e.numbers?.en),
      ...figures(e.howItWorks?.en),
      ...figures(e.cost?.en),
    ];
    if (figs.length) {
      lines.push(`- **figures you may cite:**`);
      for (const f of [...new Set(figs)].slice(0, 6)) lines.push(`  - ${f}`);
    }
    lines.push("");
  }
  const file = path.join(OUT, `${c.slug}.md`);
  fs.writeFileSync(file, lines.join("\n"), "utf8");
  console.log(`  → research/primers/facts/${c.slug}.md (${c.entries.length} entries)`);
}
console.log(`\n✓ ${codex.clusters.length} cluster fact sheet(s)`);
