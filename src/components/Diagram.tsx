import { getDiagram, getDiagramWalk } from "@/lib/content";
import type { Locale } from "@/lib/types";
import { DiagramWalk } from "./DiagramWalk";
import { Zoomable } from "./Zoomable";

/** A pre-rendered diagram. With `walk` (concept pages), it also gets the "walk through" control,
 *  whose steps are computed here, at build time, from the diagram's own graph. */
export function Diagram({ id, caption, zoomLabel, closeLabel, walk }: { id: string; caption: string; zoomLabel: string; closeLabel: string; walk?: Locale }) {
  const svg = getDiagram(id);
  if (!svg) return null;
  // Natural width of the drawing: wide diagrams keep >= 80% of it and scroll instead of shrinking
  // into unreadable text.
  const width = (s: string) => Number(s.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+)/)?.[1] ?? 0);
  const dw = (s: string) => { const w = width(s); return w ? { ["--dw" as string]: `${Math.round(w)}px` } : undefined; };
  const steps = walk ? getDiagramWalk(id) : null;
  const n = svg.narrow;
  // Phones get the top-to-bottom twin when there is one (globals.css swaps them at ≤ 640 px).
  return (
    <figure className={n ? "diagram has-n" : "diagram"}>
      <Zoomable label={zoomLabel} closeLabel={closeLabel} footer={steps && walk ? <DiagramWalk steps={steps.steps} kind={steps.kind} locale={walk} /> : undefined}>
        <div className="dg dg-dark dg-w" style={dw(svg.dark)} role="img" aria-label={caption} dangerouslySetInnerHTML={{ __html: svg.dark }} />
        <div className="dg dg-light dg-w" style={dw(svg.light)} role="img" aria-label={caption} dangerouslySetInnerHTML={{ __html: svg.light }} />
        {n && <div className="dg dg-dark dg-n" style={dw(n.dark)} role="img" aria-label={caption} dangerouslySetInnerHTML={{ __html: n.dark }} />}
        {n && <div className="dg dg-light dg-n" style={dw(n.light)} role="img" aria-label={caption} dangerouslySetInnerHTML={{ __html: n.light }} />}
      </Zoomable>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
