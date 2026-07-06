// Shared types + hooks for the interactive concept-widget kit (components/viz).
// A widget is a small, self-contained, themeable, accessible visual that makes
// ONE concept click (Big-O growth, a consistency tradeoff, a RAG pipeline…).
// Every widget takes the same props and MUST render a meaningful static frame
// when motion is reduced.
"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";

export type Track = "general" | "ai";

export interface WidgetProps {
  locale: Locale;
  track: Track;
  params?: Record<string, unknown>;
}

/** SSR-safe prefers-reduced-motion. Defaults to false (motion allowed) on the
 *  server / first paint, then updates on the client. Widgets use it to decide
 *  whether to animate or render a static snapshot. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** Read a numeric param with a fallback (params come from content-as-data). */
export function numParam(params: Record<string, unknown> | undefined, key: string, fallback: number): number {
  const v = params?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
