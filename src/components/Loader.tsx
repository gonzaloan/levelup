"use client";
// A polished loading overlay (21st.dev-style): a soft-glow animated orbit mark
// over the brand, on the dark canvas. Shows on first paint until the app is
// interactive, and again during route transitions (hooks the same signal as
// RouteProgress). Pixel theme swaps to a chunky pixel spinner. Fully CSS —
// transform/opacity only, honors reduced-motion.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function Loader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);   // boot splash on first mount
  const [nav, setNav] = useState(false);          // transient route-change overlay
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dismiss the boot splash once the first paint settles.
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 520);
    return () => clearTimeout(t);
  }, []);

  // Clear the nav overlay when the route settles.
  useEffect(() => {
    setNav(false);
    if (timer.current) clearTimeout(timer.current);
  }, [pathname]);

  // Show a brief overlay when an internal link is clicked (feels instant + intentional).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank") return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      } catch { return; }
      setNav(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setNav(false), 2500);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const show = visible || nav;
  return (
    <div className="loader-overlay" data-show={show ? "true" : "false"} aria-hidden={!show} role="status">
      <div className="loader-mark" aria-label="Loading">
        <span className="loader-orbit" />
        <span className="loader-orbit loader-orbit-2" />
        <span className="loader-core" />
      </div>
      <div className="loader-brand">
        <span className="display">level</span><span className="loader-up mono">·up</span>
      </div>
    </div>
  );
}
