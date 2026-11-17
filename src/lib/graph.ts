// Server-only: the knowledge map layout, computed once at build time and rendered as static SVG.
// Concepts are nodes, `related` links are edges; each topic is pulled toward its own region, so
// the picture reads as a map of territories with bridges between them. Deterministic (seeded).
import { allConcepts, domainIndex, getDomains } from "./content";
import { mulberry32 } from "./practice/rng";

export interface GNode { id: string; domain: string; x: number; y: number; r: number; degree: number }
export interface GEdge { a: number; b: number }
export interface GLabel { domain: string; x: number; y: number }
export interface Graph { nodes: GNode[]; edges: GEdge[]; labels: GLabel[]; width: number; height: number }

const W = 1200, H = 900;
let cache: Graph | null = null;

export function knowledgeGraph(): Graph {
  if (cache) return cache;
  const concepts = allConcepts();
  const domains = getDomains();
  const idx = new Map(concepts.map((c, i) => [c.id, i]));
  const seen = new Set<string>();
  const edges: GEdge[] = [];
  for (const c of concepts) for (const r of c.related) {
    const a = idx.get(c.id)!, b = idx.get(r);
    if (b === undefined || a === b) continue;
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!seen.has(k)) { seen.add(k); edges.push({ a: Math.min(a, b), b: Math.max(a, b) }); }
  }
  const degree = concepts.map(() => 0);
  for (const e of edges) { degree[e.a]++; degree[e.b]++; }

  // Topic regions on an ellipse; nodes start near their region with seeded jitter.
  const rand = mulberry32(20261117);
  const center = (d: string) => {
    const t = (domainIndex(d) / domains.length) * 2 * Math.PI - Math.PI / 2;
    return { x: W / 2 + Math.cos(t) * W * 0.36, y: H / 2 + Math.sin(t) * H * 0.36 };
  };
  const pos = concepts.map((c) => { const o = center(c.domain); return { x: o.x + (rand() - 0.5) * 80, y: o.y + (rand() - 0.5) * 80, vx: 0, vy: 0 }; });

  const n = concepts.length;
  for (let step = 0, temp = 1; step < 420; step++, temp *= 0.992) {
    for (let i = 0; i < n; i++) {
      const p = pos[i];
      let fx = 0, fy = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = p.x - pos[j].x, dy = p.y - pos[j].y;
        const d2 = dx * dx + dy * dy + 0.01;
        if (d2 > 160 * 160) continue;
        const f = 900 / d2; // repulsion keeps nodes readable
        fx += dx * f; fy += dy * f;
      }
      const o = center(concepts[i].domain); // pull toward the topic's region
      fx += (o.x - p.x) * 0.035; fy += (o.y - p.y) * 0.035;
      p.vx = (p.vx + fx) * 0.55; p.vy = (p.vy + fy) * 0.55;
    }
    for (const e of edges) { // springs along related links
      const p = pos[e.a], q = pos[e.b];
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      // Hooke: links inside a topic are short and firm; bridges between topics are long and weak,
      // so territories stay apart and the bridges still show.
      const same = concepts[e.a].domain === concepts[e.b].domain;
      const f = same ? (d - 45) * 0.012 : (d - 160) * 0.0012;
      p.vx += (dx / d) * f; p.vy += (dy / d) * f; q.vx -= (dx / d) * f; q.vy -= (dy / d) * f;
    }
    for (const p of pos) { p.x += Math.max(-12, Math.min(12, p.vx)) * temp; p.y += Math.max(-12, Math.min(12, p.vy)) * temp; }
  }

  // Fit into the canvas with a margin.
  const xs = pos.map((p) => p.x), ys = pos.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min((W - 80) / (maxX - minX || 1), (H - 80) / (maxY - minY || 1));
  const fit = (p: { x: number; y: number }) => ({ x: 40 + (p.x - minX) * s, y: 40 + (p.y - minY) * s });
  const nodes = concepts.map((c, i) => ({ id: c.id, domain: c.domain, ...fit(pos[i]), r: 4 + Math.min(7, degree[i] * 0.7), degree: degree[i] }));
  // Topic names sit at the middle of their territory (the halo in CSS keeps them readable).
  const labels = domains.map((d) => {
    const own = nodes.filter((x) => x.domain === d.id);
    return { domain: d.id, x: own.reduce((t, x) => t + x.x, 0) / own.length, y: own.reduce((t, x) => t + x.y, 0) / own.length };
  });
  cache = { nodes, edges, labels, width: Math.round(40 + (maxX - minX) * s + 40), height: Math.round(40 + (maxY - minY) * s + 40) };
  return cache;
}
