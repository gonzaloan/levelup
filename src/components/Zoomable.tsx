"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/** Wraps a diagram; click (or the button) opens it full-screen — wide architectures need it on phones. */
export function Zoomable({ children, label, closeLabel }: { children: ReactNode; label: string; closeLabel: string }) {
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [zoom]);
  return (
    <div className={zoom ? "zoomable zoomed" : "zoomable"}>
      <button type="button" className="icon-btn zoom-btn" onClick={() => setZoom(!zoom)} aria-label={zoom ? closeLabel : label} title={zoom ? closeLabel : label}>
        <Icon name={zoom ? "close" : "expand"} size={16} />
      </button>
      <div className="zoom-body" onClick={() => !zoom && setZoom(true)}>{children}</div>
    </div>
  );
}
