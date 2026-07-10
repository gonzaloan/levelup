#!/usr/bin/env node
/* Deterministic, validating merge of per-lesson enrichment patches into
   src/content/data/lessons.json. NEVER trust raw agent JSON — this validates
   every field shape, rejects unknown concept slugs, and merges ADDITIVELY
   (flashcards / children / mnemonic on concepts; cheatSheet on lessons).
   Reruns are idempotent (overwrites the same enrichment fields).

   Usage: node research/merge-enrichment.mjs research/enrich-patches   (dir of *.json)
          node research/merge-enrichment.mjs --check research/enrich-patches  (validate only)
*/
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const LESSONS_PATH = "src/content/data/lessons.json";
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const dir = args.filter(a => a !== "--check")[0] || "research/enrich-patches";

const isI18n = (v) => v && typeof v === "object" && typeof v.en === "string" && typeof v.es === "string"
  && v.en.trim().length > 0 && v.es.trim().length > 0;

const errors = [];
const warn = [];

function validatePatch(patch, fname, slugSet, lessonIds) {
  if (!patch.lessonId || !lessonIds.has(patch.lessonId)) {
    errors.push(`${fname}: unknown lessonId "${patch.lessonId}"`); return;
  }
  if (patch.cheatSheet !== undefined) {
    if (!Array.isArray(patch.cheatSheet)) errors.push(`${fname}: cheatSheet must be an array`);
    else patch.cheatSheet.forEach((sec, i) => {
      if (!isI18n(sec.heading)) errors.push(`${fname}: cheatSheet[${i}].heading not bilingual`);
      if (!Array.isArray(sec.rows) || !sec.rows.length) errors.push(`${fname}: cheatSheet[${i}].rows empty`);
      else sec.rows.forEach((r, j) => {
        if (!isI18n(r.term)) errors.push(`${fname}: cheatSheet[${i}].rows[${j}].term not bilingual`);
        if (!isI18n(r.note)) errors.push(`${fname}: cheatSheet[${i}].rows[${j}].note not bilingual`);
      });
    });
  }
  const cs = patch.concepts || {};
  for (const [slug, enr] of Object.entries(cs)) {
    const key = `${patch.lessonId}::${slug}`;
    if (!slugSet.has(key)) { errors.push(`${fname}: concept slug "${slug}" not in lesson ${patch.lessonId}`); continue; }
    if (enr.flashcards !== undefined) {
      if (!Array.isArray(enr.flashcards) || !enr.flashcards.length) errors.push(`${fname}:${slug}: flashcards empty`);
      else enr.flashcards.forEach((f, i) => {
        if (!isI18n(f.front)) errors.push(`${fname}:${slug}: flashcards[${i}].front not bilingual`);
        if (!isI18n(f.back)) errors.push(`${fname}:${slug}: flashcards[${i}].back not bilingual`);
      });
    }
    if (enr.children !== undefined) {
      if (!Array.isArray(enr.children) || !enr.children.length) errors.push(`${fname}:${slug}: children empty`);
      else enr.children.forEach((c, i) => {
        if (!isI18n(c.label)) errors.push(`${fname}:${slug}: children[${i}].label not bilingual`);
        if (!isI18n(c.detail)) errors.push(`${fname}:${slug}: children[${i}].detail not bilingual`);
      });
    }
    if (enr.mnemonic !== undefined && !isI18n(enr.mnemonic)) errors.push(`${fname}:${slug}: mnemonic not bilingual`);
  }
}

function main() {
  const data = JSON.parse(readFileSync(LESSONS_PATH, "utf8"));
  const lessons = data.lessons;
  const lessonIds = new Set(lessons.map(l => l.lessonId));
  const slugSet = new Set();
  const conceptRef = new Map();      // "lessonId::slug" -> concept object
  const lessonRef = new Map();       // lessonId -> lesson object
  for (const l of lessons) {
    lessonRef.set(l.lessonId, l);
    for (const c of l.concepts) { const k = `${l.lessonId}::${c.slug}`; slugSet.add(k); conceptRef.set(k, c); }
  }

  let files = [];
  try { files = readdirSync(dir).filter(f => f.endsWith(".json")); }
  catch { console.error(`No patch dir at ${dir}`); process.exit(2); }
  if (!files.length) { console.error(`No *.json patches in ${dir}`); process.exit(2); }

  const patches = [];
  for (const f of files) {
    let p;
    try { p = JSON.parse(readFileSync(join(dir, f), "utf8")); }
    catch (e) { errors.push(`${f}: invalid JSON — ${e.message}`); continue; }
    const arr = Array.isArray(p) ? p : [p];
    for (const one of arr) { validatePatch(one, f, slugSet, lessonIds); patches.push(one); }
  }

  if (errors.length) {
    console.error(`VALIDATION FAILED — ${errors.length} error(s):`);
    errors.slice(0, 60).forEach(e => console.error("  ✗ " + e));
    process.exit(1);
  }

  // Merge additively.
  let nFlash = 0, nChild = 0, nMnem = 0, nCheat = 0;
  for (const p of patches) {
    const lesson = lessonRef.get(p.lessonId);
    if (p.cheatSheet) { lesson.cheatSheet = p.cheatSheet; nCheat++; }
    for (const [slug, enr] of Object.entries(p.concepts || {})) {
      const c = conceptRef.get(`${p.lessonId}::${slug}`);
      if (enr.flashcards) { c.flashcards = enr.flashcards; nFlash++; }
      if (enr.children) { c.children = enr.children; nChild++; }
      if (enr.mnemonic) { c.mnemonic = enr.mnemonic; nMnem++; }
    }
  }

  const summary = `flashcards:${nFlash} concepts · children:${nChild} · mnemonic:${nMnem} · cheatSheet:${nCheat} lessons`;
  if (checkOnly) { console.log("VALIDATION OK (no write). Would merge: " + summary); return; }

  // Write UTF-8, 2-space, trailing newline (match repo convention).
  writeFileSync(LESSONS_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("MERGED OK → " + LESSONS_PATH);
  console.log("  " + summary);
}

main();
