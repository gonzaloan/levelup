"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * ← / → move to the previous / next concept (ignored while typing or with modifiers).
 * `self` is this page's path: during a client-side transition the old page's listener is still
 * attached after the URL has changed, and without the check one key press navigated twice.
 */
export function KeyNav({ self, prev, next }: { self: string; prev?: string; next?: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (window.location.pathname !== self) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (document.querySelector(".palette, .zoomed")) return;
      if (e.key === "ArrowLeft" && prev) router.push(prev);
      if (e.key === "ArrowRight" && next) router.push(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [self, prev, next, router]);
  return null;
}
