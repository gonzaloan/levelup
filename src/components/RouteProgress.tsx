"use client";
// Instant navigation feedback. Next's client router gives no built-in pending
// signal, so clicks on a heavy static export can feel "stuck". This paints a
// thin top progress bar the moment a same-origin link is clicked and clears it
// once the pathname actually changes — so a click always visibly does something.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the bar whenever the route settles.
  useEffect(() => {
    setActive(false);
    if (timer.current) clearTimeout(timer.current);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank") return;
      // same-origin internal navigation only
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
      } catch { return; }
      setActive(true);
      // safety: auto-clear if navigation is cancelled
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setActive(false), 4000);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return <div className="route-progress" data-active={active ? "true" : "false"} aria-hidden="true" />;
}
