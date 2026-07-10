"use client";
// Signature mode switch: a two-segment sliding-thumb pill that flips the whole
// site between the polished "studio" theme and the Mario-3 "pixel overworld"
// skin. Modeled on get-certified's flagship .mode-switch (sun = studio, space
// invader = pixel). Persists to localStorage; the boot script in layout.tsx
// applies it before paint so there's no flash on reload.
import { useEffect, useState } from "react";

type Theme = "studio" | "pixel";
const KEY = "levelup.theme";

// Warm daylight sun = the calm studio skin. Inherits currentColor so it recolors
// with the active segment.
function SunGlyph() {
  return (
    <svg className="ms-glyph" viewBox="0 0 24 24" width="15" height="15" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
    </svg>
  );
}

// Classic space-invader built from unit squares on a pixel grid (fills
// currentColor, crisp edges). Reads as the playful pixel skin.
const INVADER_CELLS: ReadonlyArray<readonly [number, number]> = [
  [3, 0], [7, 0],
  [4, 1], [6, 1],
  [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
  [2, 3], [3, 3], [5, 3], [7, 3], [8, 3],
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
  [1, 5], [3, 5], [5, 5], [7, 5], [9, 5],
  [3, 6], [4, 6], [6, 6], [7, 6],
];
function InvaderGlyph() {
  return (
    <svg className="ms-glyph ms-glyph-pixel" viewBox="0 0 11 7" width="17" height="12"
      fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      {INVADER_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

export function ThemeToggle({ labelStudio, labelPixel }: { labelStudio: string; labelPixel: string }) {
  const [theme, setTheme] = useState<Theme>("studio");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && window.localStorage.getItem(KEY)) as Theme | null;
    if (saved === "pixel") setTheme("pixel");
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    try { window.localStorage.setItem(KEY, next); } catch { /* private mode */ }
    if (next === "pixel") document.documentElement.setAttribute("data-theme", "pixel");
    else document.documentElement.removeAttribute("data-theme");
  }

  function toggle() {
    apply(theme === "pixel" ? "studio" : "pixel");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    // Enter/Space are native for <button>; add arrows to set a specific side.
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); apply("studio"); }
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); apply("pixel"); }
  }

  const isPixel = theme === "pixel";
  // The switch's accessible NAME must be stable and identify what it controls
  // (the pixel theme); aria-checked alone conveys on/off. The title carries the
  // destination hint for sighted mouse users without polluting the SR name.
  const destinationLabel = isPixel ? labelStudio : labelPixel;
  return (
    <button type="button" className="mode-switch" role="switch"
      aria-checked={isPixel} aria-label={labelPixel} title={destinationLabel}
      onClick={toggle} onKeyDown={onKeyDown}>
      <span className="ms-thumb" aria-hidden="true" />
      <span className="ms-seg ms-seg-studio">
        <span className="ms-ico"><SunGlyph /></span>
        <span className="ms-txt">{labelStudio}</span>
      </span>
      <span className="ms-seg ms-seg-pixel">
        <span className="ms-ico"><InvaderGlyph /></span>
        <span className="ms-txt">{labelPixel}</span>
      </span>
    </button>
  );
}
