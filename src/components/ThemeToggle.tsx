"use client";
// Theme switch: flips the whole site between the polished "studio" theme and
// the Mario-3 "pixel overworld" skin. Persists to localStorage; the boot script
// in layout.tsx applies it before paint so there's no flash on reload.
import { useEffect, useState } from "react";

type Theme = "studio" | "pixel";
const KEY = "levelup.theme";

export function ThemeToggle({ labelStudio, labelPixel }: { labelStudio: string; labelPixel: string }) {
  const [theme, setTheme] = useState<Theme>("studio");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && window.localStorage.getItem(KEY)) as Theme | null;
    if (saved === "pixel") setTheme("pixel");
  }, []);

  function toggle() {
    const next: Theme = theme === "pixel" ? "studio" : "pixel";
    setTheme(next);
    try { window.localStorage.setItem(KEY, next); } catch { /* private mode */ }
    if (next === "pixel") document.documentElement.setAttribute("data-theme", "pixel");
    else document.documentElement.removeAttribute("data-theme");
  }

  const isPixel = theme === "pixel";
  return (
    <button className="theme-toggle" onClick={toggle} aria-pressed={isPixel}
      title={isPixel ? labelStudio : labelPixel}>
      <span aria-hidden="true">{isPixel ? "◆" : "▚"}</span>
      <span>{isPixel ? labelStudio : labelPixel}</span>
    </button>
  );
}
