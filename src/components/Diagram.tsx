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
  const w = Number(svg.dark.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+)/)?.[1] ?? 0);
  const steps = walk ? getDiagramWalk(id) : null;
  return (
    <figure className="diagram" style={w ? { ["--dw" as string]: `${Math.round(w)}px` } : undefined}>
      <Zoomable label={zoomLabel} closeLabel={closeLabel} footer={steps && walk ? <DiagramWalk steps={steps.steps} kind={steps.kind} locale={walk} /> : undefined}>
        <div className="dg dg-dark" role="img" aria-label={caption} dangerouslySetInnerHTML={{ __html: svg.dark }} />
        <div className="dg dg-light" role="img" aria-label={caption} dangerouslySetInnerHTML={{ __html: svg.light }} />
      </Zoomable>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
