#!/usr/bin/env node
/**
 * Turn an authored code-patch source file into a merge-code patch.
 *
 * The one job here is annotation line numbers. Writing them by hand means every
 * later edit to a snippet silently points a note at the wrong line — the
 * validator only catches out-of-range, not off-by-one. So sources anchor each
 * note to a unique SUBSTRING of the line it belongs to, and this resolves them.
 *
 * A source file exports { patches: [{ lessonId, slug, lang, caption, snippet,
 * notes: [{ at, note }] }] }. `at` must match exactly one line.
 *
 * Usage: node tools/build-code-patch.cjs research/code/cloud-l3-l4.cjs
 *        → writes research/code/cloud-l3-l4.json
 */
const fs = require("node:fs");
const path = require("node:path");

function resolve(snippet, notes, where) {
  const lines = snippet.split("\n");
  return (notes ?? []).map(({ at, note }) => {
    const hits = lines.map((l, i) => (l.includes(at) ? i + 1 : 0)).filter(Boolean);
    if (hits.length === 0) throw new Error(`${where}: annotation anchor not found: ${JSON.stringify(at)}`);
    if (hits.length > 1) throw new Error(`${where}: annotation anchor is ambiguous (lines ${hits.join(", ")}): ${JSON.stringify(at)}`);
    return { line: hits[0], note };
  });
}

function main() {
  const src = process.argv[2];
  if (!src) { console.error("usage: node tools/build-code-patch.cjs <source.cjs>"); process.exit(2); }
  const abs = path.resolve(src);
  const { patches } = require(abs);
  const out = patches.map((p) => {
    const where = `${p.lessonId}/${p.slug}`;
    const snippet = p.snippet.replace(/^\n/, "").replace(/\n+$/, "");
    return {
      lessonId: p.lessonId,
      slug: p.slug,
      code: {
        lang: p.lang,
        snippet,
        ...(p.caption ? { caption: p.caption } : {}),
        annotations: resolve(snippet, p.notes, where),
      },
    };
  });
  const dest = abs.replace(/\.cjs$/, ".json");
  fs.writeFileSync(dest, JSON.stringify({ patches: out }, null, 1), "utf8");
  console.log(`✓ ${dest}: ${out.length} patch(es), ${out.reduce((n, p) => n + p.code.annotations.length, 0)} annotation(s)`);
}

main();
