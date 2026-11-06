// Pure, dependency-free search over the generated index. Accent/case-insensitive, every query
// term must match somewhere (AND), weighted by field: title > alias > tldr > question > body.
import type { SearchDoc } from "./types";

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9+#.\s-]/g, " ");

interface Prepared { doc: SearchDoc; t: string; o: string; a: string; s: string; b: string; q: string }

export function prepare(docs: SearchDoc[]): Prepared[] {
  return docs.map((doc) => ({ doc, t: norm(doc.t), o: norm(doc.o), a: norm(doc.a), s: norm(doc.s), b: norm(doc.b), q: norm(doc.q) }));
}

const wordHit = (hay: string, term: string) => new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(hay);

function termScore(p: Prepared, term: string): number {
  let best = 0;
  const fields: [string, number, number][] = [
    // [text, score if a word starts with term, score if term appears anywhere]
    [p.t, 12, 6], [p.o, 8, 4], [p.a, 10, 5], [p.s, 4, 2], [p.q, 3, 1.5], [p.b, 2, 1],
  ];
  for (const [text, word, sub] of fields) {
    if (!text.includes(term)) continue;
    best = Math.max(best, wordHit(text, term) ? word : sub);
  }
  return best;
}

export function search(prepared: Prepared[], query: string, limit = 20): SearchDoc[] {
  const terms = norm(query).split(/\s+/).filter((x) => x.length > 0);
  if (!terms.length) return [];
  const phrase = norm(query).trim();
  const scored: { doc: SearchDoc; score: number }[] = [];
  for (const p of prepared) {
    let score = 0, all = true;
    for (const term of terms) {
      const s = termScore(p, term);
      if (!s) { all = false; break; }
      score += s;
    }
    if (!all) continue;
    if (p.t === phrase || p.a.split(" · ").includes(phrase)) score += 30; // exact title / acronym
    else if (p.t.startsWith(phrase)) score += 15;
    if (p.doc.l === "core") score += 0.5;
    scored.push({ doc: p.doc, score });
  }
  return scored.sort((x, y) => y.score - x.score).slice(0, limit).map((x) => x.doc);
}
