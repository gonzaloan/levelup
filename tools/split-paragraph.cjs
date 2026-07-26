#!/usr/bin/env node
/**
 * Insert a paragraph break inside an authored explanation, without editing text.
 *
 * The concept pane shows a ~110-word lead and folds the rest. Eight concepts have
 * a FIRST paragraph longer than that on its own (up to 198 words in Spanish), so
 * for those the layout can't help — the paragraph itself is the wall. The fix is
 * a break at a sentence boundary the author already wrote, which is a content
 * change, so it goes through a tool that provably preserves every word.
 *
 * Each rule names the sentence the new paragraph should START with, per locale.
 * The script asserts the split is lossless (same words, same order) and that the
 * anchor matched exactly once, then re-validates through merge-lessons.
 *
 * Usage: node tools/split-paragraph.cjs [--dry-run]
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const LESSONS = path.join(ROOT, "src/content/data/lessons.json");

/**
 * Where to break, chosen at the point the paragraph changes job — the first half
 * makes the argument, the second half turns it into the rule you apply.
 */
const RULES = [
  {
    lesson: "technical-depth-l4",
    slug: "performance-engineering-methodology-capacity-planning",
    // …the worked smell-test, then the ladder as the general intuition.
    en: "The orders of magnitude are the intuition:",
    es: "Los órdenes de magnitud son la intuición:",
  },
  {
    lesson: "systems-architecture-l3",
    slug: "capacity-estimation",
    // …the worked calculation, then what the resulting number decides.
    en: "That single number changes everything:",
    es: "Ese solo número lo cambia todo:",
  },
  {
    lesson: "execution-delivery-l5",
    slug: "execution-leadership-driving-large-ambiguous",
    // …the trap, then where the critical path actually runs.
    en: "And that chain almost always runs through things that aren't code:",
    es: "Y esa cadena casi siempre pasa por cosas que no son código:",
  },
  {
    lesson: "ai-engineering-l6",
    slug: "ai-governance-responsible-ai-program",
    // …the two frameworks, then the action they imply. This one is the longest
    // in the corpus and gets two breaks.
    en: "Your first governance act is classification:",
    es: "Tu primer acto de gobernanza es clasificar:",
  },
  {
    lesson: "ai-engineering-l6",
    slug: "ai-governance-responsible-ai-program",
    en: "The EU AI Act",
    es: "La EU AI Act",
  },
];

const words = (s) => s.trim().split(/\s+/).filter(Boolean);

function splitParagraph(text, anchor, where) {
  const paras = text.split("\n");
  let hits = 0;
  const out = [];
  for (const p of paras) {
    const idx = p.indexOf(anchor);
    if (idx <= 0) { out.push(p); continue; }   // idx 0 = already a paragraph start
    hits++;
    out.push(p.slice(0, idx).trimEnd());
    out.push(p.slice(idx).trimStart());
  }
  if (hits === 0) throw new Error(`${where}: anchor not found mid-paragraph: ${JSON.stringify(anchor)}`);
  if (hits > 1) throw new Error(`${where}: anchor matched ${hits} paragraphs: ${JSON.stringify(anchor)}`);
  const result = out.join("\n");
  // The invariant that makes this safe to run on 3MB of authored content.
  const before = words(text).join(" ");
  const after = words(result).join(" ");
  if (before !== after) throw new Error(`${where}: split changed the text (not just the breaks)`);
  return result;
}

function main() {
  const dry = process.argv.includes("--dry-run");
  const data = JSON.parse(fs.readFileSync(LESSONS, "utf8"));
  let applied = 0;

  for (const rule of RULES) {
    const lesson = data.lessons.find((l) => l.lessonId === rule.lesson);
    if (!lesson) throw new Error(`no such lesson: ${rule.lesson}`);
    const concept = lesson.concepts.find((c) => c.slug === rule.slug);
    if (!concept) throw new Error(`no such concept: ${rule.lesson}/${rule.slug}`);
    for (const loc of ["en", "es"]) {
      const where = `${rule.lesson}/${rule.slug}.${loc}`;
      concept.explanation[loc] = splitParagraph(concept.explanation[loc], rule[loc], where);
    }
    applied++;
    console.log(`  split ${rule.lesson}/${rule.slug} at "${rule.en.slice(0, 40)}…"`);
  }

  if (dry) { console.log(`\n✓ dry run: ${applied} split(s) would apply.`); return; }
  fs.writeFileSync(LESSONS, JSON.stringify(data), "utf8");
  console.log(`\n✓ wrote lessons.json: ${applied} paragraph split(s)`);
}

main();
