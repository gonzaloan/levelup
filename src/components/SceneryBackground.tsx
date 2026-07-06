"use client";
// A themed parallax backdrop mounted BEHIND lesson/checkpoint content, so the
// reading experience feels like part of the same world as the overworld picker
// (which was the engagement cliff: gorgeous map → bare text column). Fixed,
// pointer-events:none, aria-hidden — pure decoration.
//
// Pixel theme: a DawnBringer sky gradient with a pixel sun, drifting clouds and
// a far mountain band — the SAME sprite vocabulary as PixelOverworld. Studio
// theme: the restrained observatory gradient (reuses the .sky look). All motion
// lives in CSS keyframes gated on prefers-reduced-motion; nothing here animates
// via JS, and content is never hidden by this layer.
import { PixelSprite } from "./PixelSprite";

export function SceneryBackground({ track = "general" }: { track?: "general" | "ai" }) {
  return (
    <div className="scenery" data-track={track} aria-hidden="true">
      {/* Studio: soft gradient wash (CSS only). */}
      <div className="scenery-wash" />
      {/* Pixel: sky band + sun + drifting clouds + mountains. Rendered always,
          but only VISIBLE under [data-theme="pixel"] via CSS — keeps the DOM
          identical across themes so hydration is stable. */}
      <div className="scenery-pixel">
        <div className="scenery-sky" />
        <div className="scenery-sun"><PixelSprite name="sun" /></div>
        <div className="scenery-cloud sc-c1"><PixelSprite name="cloud" /></div>
        <div className="scenery-cloud sc-c2"><PixelSprite name="cloud" /></div>
        <div className="scenery-cloud sc-c3"><PixelSprite name="cloud" /></div>
        <div className="scenery-mtn"><PixelSprite name="mountainsFar" /></div>
        <div className="scenery-ground" />
      </div>
    </div>
  );
}

export default SceneryBackground;
