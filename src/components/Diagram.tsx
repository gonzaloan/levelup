import { getDiagram } from "@/lib/content";
import { Zoomable } from "./Zoomable";

export function Diagram({ id, caption, zoomLabel, closeLabel }: { id: string; caption: string; zoomLabel: string; closeLabel: string }) {
  const svg = getDiagram(id);
  if (!svg) return null;
  // Natural width of the drawing: wide diagrams keep >= 80% of it and scroll instead of shrinking
  // into unreadable text.
  const w = Number(svg.dark.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+)/)?.[1] ?? 0);
  return (
    <figure className="diagram" role="img" aria-label={caption} style={w ? { ["--dw" as string]: `${Math.round(w)}px` } : undefined}>
      <Zoomable label={zoomLabel} closeLabel={closeLabel}>
        <div className="dg dg-dark" dangerouslySetInnerHTML={{ __html: svg.dark }} />
        <div className="dg dg-light" dangerouslySetInnerHTML={{ __html: svg.light }} />
      </Zoomable>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
