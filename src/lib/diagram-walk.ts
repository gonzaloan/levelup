// The order a diagram walkthrough visits its parts, computed at build time from the diagram's own
// data: a flowchart's graph.json (nodes + edges) or a sequence diagram's messages, read from the
// pre-rendered SVG. Pure (no fs), so it is unit-tested and the client only receives the steps.

/** One stop of a walkthrough. Flowcharts name a node (`n`) and the edges that reach it (`via`,
 *  the SVG's own `data-id`s); sequence diagrams name the message by its index (`m`). */
export interface WalkStep { n?: string; m?: number; label: string; via?: string[]; edge?: string }
export interface WalkGraph { nodes: { id: string; label: string }[]; edges: { from: string; to: string }[] }

/**
 * Flow order: Kahn's algorithm with a FIFO queue, so inputs come before the step that needs them
 * and the walk reads breadth-first from the sources, ties in the diagram's own order. A cycle (an
 * agent loop) is entered at the first unvisited node that a visited node points to.
 */
export function flowOrder(g: WalkGraph): string[] {
  const ids = g.nodes.map((n) => n.id);
  const known = new Set(ids);
  const edges = g.edges.filter((e) => known.has(e.from) && known.has(e.to) && e.from !== e.to);
  const indeg = new Map(ids.map((id) => [id, 0]));
  for (const e of edges) indeg.set(e.to, indeg.get(e.to)! + 1);
  const seen = new Set<string>();
  const order: string[] = [];
  const queue = ids.filter((id) => indeg.get(id) === 0);
  while (order.length < ids.length) {
    if (!queue.length) {
      const entry = ids.find((id) => !seen.has(id) && edges.some((e) => e.to === id && seen.has(e.from))) ?? ids.find((id) => !seen.has(id))!;
      queue.push(entry);
    }
    const u = queue.shift()!;
    if (seen.has(u)) continue;
    seen.add(u);
    order.push(u);
    for (const e of edges) {
      if (e.from !== u || seen.has(e.to)) continue;
      const d = indeg.get(e.to)! - 1;
      indeg.set(e.to, d);
      if (d === 0) queue.push(e.to);
    }
  }
  return order;
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
/** The visible text of an SVG fragment: tags dropped, entities decoded, whitespace collapsed. */
export const svgText = (s: string) =>
  s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/&(#?\w+);/g, (m, k: string) => ENT[k] ?? m).replace(/\s+/g, " ").trim();

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Walk of a flowchart: every node once, in flow order. Each step lights the edges that join it
 *  to a node already visited (in either direction, so a loop's back edge lights up too). */
export function flowWalk(g: WalkGraph, svg: string): WalkStep[] {
  const order = flowOrder(g);
  const label = new Map(g.nodes.map((n) => [n.id, n.label]));
  const edgeIds = [...new Set([...svg.matchAll(/data-id="(L_[^"]+)"/g)].map((m) => m[1]))];
  const idsOf = (from: string, to: string) => edgeIds.filter((d) => d.startsWith(`L_${from}_${to}_`) && /^\d+$/.test(d.slice(`L_${from}_${to}_`.length)));
  const edgeLabel = (d: string) => svgText(svg.match(new RegExp(`<g class="label" data-id="${esc(d)}"[^>]*>([\\s\\S]*?)</g></g>`))?.[1] ?? "");
  const pos = new Map(order.map((id, k) => [id, k]));
  return order.map((id, k) => {
    const joins = g.edges.filter((e) => (e.to === id && pos.get(e.from)! <= k) || (e.from === id && pos.get(e.to)! < k));
    const via = joins.flatMap((e) => idsOf(e.from, e.to));
    const edge = joins.filter((e) => e.to === id).flatMap((e) => idsOf(e.from, e.to)).map(edgeLabel).find(Boolean);
    let text = label.get(id) ?? id;
    // A subgraph used as a node keeps its id as its label: read the cluster's title instead.
    if (text === id) {
      const at = svg.search(new RegExp(`<g class="cluster[^"]*" id="[^"]*-${esc(id)}"`));
      const head = at < 0 ? "" : svg.slice(at, svg.indexOf("</text>", at) + 7);
      const title = svgText(head.slice(head.indexOf("cluster-label")).replace(/^[^>]*>/, ""));
      if (title) text = title;
    }
    return { n: id, label: text, ...(via.length ? { via } : {}), ...(edge ? { edge } : {}) };
  });
}

/** Walk of a sequence diagram: its messages, top to bottom. */
export function sequenceWalk(svg: string): WalkStep[] {
  return [...svg.matchAll(/<text[^>]*class="messageText"[^>]*>([\s\S]*?)<\/text>/g)].map((m, k) => ({ m: k, label: svgText(m[1]) || "…" }));
}
