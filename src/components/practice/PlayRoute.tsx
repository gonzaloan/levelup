"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/types";
import type { Mode } from "@/lib/practice/session";
import { Player } from "./Player";

const MODES: Mode[] = ["daily", "concept", "module", "topic", "weak", "mock", "cards"];

/** Reads ?mode=&id= after mount (static export: no server-side query), then runs the session. */
export function PlayRoute({ locale }: { locale: Locale }) {
  const [p, setP] = useState<{ mode: Mode; id?: string } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const mode = (q.get("mode") ?? "daily") as Mode;
    setP({ mode: MODES.includes(mode) ? mode : "daily", id: q.get("id") ?? undefined });
  }, []);
  return p ? <Player locale={locale} mode={p.mode} id={p.id} /> : null;
}
