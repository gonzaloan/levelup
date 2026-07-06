"use client";
// Renders a named pixel-art sprite from the ported get-certified engine as
// crisp inline SVG. dangerouslySetInnerHTML is safe here: the SVG is generated
// from a fixed char-matrix palette in our own module, no user input.
import { sprite, node as nodeSprite } from "@/lib/pixels";

export function PixelSprite({
  name, className, style, ariaHidden = true,
}: {
  name: string; className?: string; style?: React.CSSProperties; ariaHidden?: boolean;
}) {
  const svg = sprite(name, { class: "pixel" });
  return (
    <span className={`sprite ${className ?? ""}`} style={style} aria-hidden={ariaHidden}
      dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

export function PixelNode({
  state, className, style,
}: {
  state: "locked" | "open" | "current" | "done" | "boss" | "special"; className?: string; style?: React.CSSProperties;
}) {
  const svg = nodeSprite({ state, class: "pixel" });
  return (
    <span className={`sprite ${className ?? ""}`} style={style} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
