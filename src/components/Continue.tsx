"use client";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { useStudyState } from "./practice/usePractice";
import { Icon } from "./Icon";
import { dayKey, streakOf } from "@/lib/practice/store";

/** "Where you left off": the first concept in the path you haven't read, plus today's status. */
export function ContinueCard({ order, locale }: { order: { id: string; t: string; m: string }[]; locale: Locale }) {
  const [s] = useStudyState();
  if (!s) return null;
  const started = Object.keys(s.read).length + Object.keys(s.cards).length > 0;
  const practiced = new Set(Object.keys(s.cards).map((k) => k.slice(0, k.indexOf("."))));
  const next = order.find((c) => !s.read[c.id] && !practiced.has(c.id));
  const idx = next ? order.indexOf(next) : order.length;
  const es = locale === "es";
  const streak = streakOf(s, new Date());
  const today = s.days[dayKey(new Date())]?.xp ?? 0;
  if (!started) return null;
  return (
    <section className="continue">
      <div>
        <span className="hub-label">{es ? "Donde quedaste" : "Where you left off"} · {idx}/{order.length}</span>
        {next ? <strong>{next.t}</strong> : <strong>{es ? "¡Ruta completa!" : "Path complete!"}</strong>}
        {next && <span className="hub-sub">{next.m}</span>}
      </div>
      <div className="continue-actions">
        {next && <Link className="btn btn-primary" href={`/${locale}/c/${next.id}/`}><Icon name="book" size={16} /> {es ? "Continuar" : "Continue"}</Link>}
        <Link className="btn" href={`/${locale}/practice/`}><Icon name="cards" size={16} /> {es ? "Práctica" : "Practice"} · 🔥 {streak.days} · {today} XP</Link>
      </div>
    </section>
  );
}
