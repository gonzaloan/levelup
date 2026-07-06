"use client";
// The shared chrome for every viz widget: a themed figure with an optional
// title, a body region, an optional controls bar, and an optional caption.
// Keeps all widgets visually consistent across Studio and Pixel and centralizes
// the accessibility scaffolding (role="group", labelled region).
import type { ReactNode } from "react";

export function VizFrame({
  title, caption, controls, ariaLabel, children,
}: {
  title?: string;
  caption?: string;
  controls?: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <figure className="viz" role="group" aria-label={ariaLabel ?? title} style={{ margin: 0 }}>
      {title && <figcaption className="viz-title eyebrow">{title}</figcaption>}
      <div className="viz-body">{children}</div>
      {controls && <div className="viz-controls">{controls}</div>}
      {caption && <p className="viz-caption dim">{caption}</p>}
    </figure>
  );
}

export default VizFrame;
