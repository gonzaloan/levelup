"use client";
// A soft glow under the pointer on the card it hovers: one listener on the list sets --mx/--my on
// that card (CSS draws the glow, see .lab-card::after). Nothing runs on touch screens.
import type { ReactNode } from "react";

export function Spotlight({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={className} onPointerMove={(e) => {
      if (e.pointerType !== "mouse") return;
      const card = (e.target as HTMLElement).closest<HTMLElement>("a, .lab-card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    }}>
      {children}
    </div>
  );
}
