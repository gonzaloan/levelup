"use client";
// A decorative masked hero band behind a page title.
//
// Project rule (CLAUDE.md): diffusion/raster art is for DECORATION only — never
// for anything explanatory. This component enforces that contract structurally:
// it is aria-hidden, pointer-events-none, sits at z-index 0 behind the content,
// and if the file is missing it simply doesn't render (the authored gradient
// underneath is always the real background). No layout depends on it.
import { useState } from "react";

export function PageHeroArt({ src, align = "right" }: { src: string; align?: "right" | "center" }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div
      aria-hidden="true"
      className="pagehero"
      style={{ ["--ph-pos" as string]: align === "center" ? "50% 40%" : "78% 40%" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setOk(false)} />
    </div>
  );
}
