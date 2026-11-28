"use client";
// Practicar: four ways to practice, one card each, with what's waiting in it (docs/specs/simplify.md).
// Review is the daily habit, so it carries the accent; stats, activity and backup live in Tú.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { dayKey, type StudyState } from "@/lib/practice/store";
import { buildSession, dueItems } from "@/lib/practice/session";
import { loadGym, today as gymToday } from "@/lib/gym/store";
import { usePracticeData, useStudyState } from "./usePractice";
import { useResolveDue } from "./ResolveDue";
import { Icon } from "../Icon";

const T = {
  en: { review: "Review", reviewSub: "Spaced repetition: each card comes back just before you'd forget it.", due: (d: number, n: number) => (d || n ? `${d} due · ${n} new` : "All caught up"),
    start: "Start review", code: "Coding", codeSub: "Interview problems in Python, run in your browser.", codeDue: (n: number) => `${n} to re-solve today`,
    gym: "Gym", gymSub: "Today's 8 reps by hand: estimate, trace, spot the bug.", gymDone: "Done today ✓",
    mocks: "Mock interviews", mocksSub: "Coding round, system design round, behavioral stories.", loading: "Loading…" },
  es: { review: "Repaso", reviewSub: "Repaso espaciado: cada tarjeta vuelve justo antes de que la olvides.", due: (d: number, n: number) => (d || n ? `${d} pendientes · ${n} nuevas` : "Al día"),
    start: "Empezar repaso", code: "Coding", codeSub: "Problemas de entrevista en Python, en tu navegador.", codeDue: (n: number) => `${n} para re-resolver hoy`,
    gym: "Gimnasio", gymSub: "Los 8 ejercicios de hoy a mano: estimar, leer código, encontrar el bug.", gymDone: "Hecho hoy ✓",
    mocks: "Simulacros", mocksSub: "Ronda de coding, ronda de system design e historias conductuales.", loading: "Cargando…" },
};

export function Hub({ locale }: { locale: Locale }) {
  const t = T[locale];
  const data = usePracticeData(locale);
  const [state] = useStudyState();
  const now = useMemo(() => new Date(), []);
  const resolveDue = useResolveDue();
  const [gymDone, setGymDone] = useState(false);
  useEffect(() => { setGymDone(!!loadGym().days[gymToday()]?.done); }, []);
  const counts = useMemo(() => {
    if (!data || !state) return null;
    const daily = buildSession(data, state, { mode: "daily" }, now);
    return { due: dueItems(data, state, now).length, fresh: daily.filter((i) => !state.cards[i.id]).length };
  }, [data, state, now]);

  return (
    <div className="hub">
      <section className="pc pc-main">
        <span className="pc-icon"><Icon name="cycle" size={22} /></span>
        <div className="pc-text"><h2>{t.review}</h2><p>{t.reviewSub}</p><strong className="pc-status">{counts ? t.due(counts.due, counts.fresh) : t.loading}</strong></div>
        <a className="btn btn-primary pc-go" href={`/${locale}/practice/play/?mode=daily`}>{t.start} <Icon name="right" size={18} /></a>
      </section>
      <Link className="pc" href={`/${locale}/practice/code/${resolveDue ? "review/" : ""}`}>
        <span className="pc-icon"><Icon name="code" size={22} /></span>
        <div className="pc-text"><h2>{t.code}</h2><p>{t.codeSub}</p>{resolveDue > 0 && <strong className="pc-status">{t.codeDue(resolveDue)}</strong>}</div>
        <Icon name="right" size={18} />
      </Link>
      <Link className="pc" href={`/${locale}/gym/`}>
        <span className="pc-icon"><Icon name="zap" size={22} /></span>
        <div className="pc-text"><h2>{t.gym}</h2><p>{t.gymSub}</p>{gymDone && <strong className="pc-status ok">{t.gymDone}</strong>}</div>
        <Icon name="right" size={18} />
      </Link>
      <Link className="pc" href={`/${locale}/interview/`}>
        <span className="pc-icon"><Icon name="mic" size={22} /></span>
        <div className="pc-text"><h2>{t.mocks}</h2><p>{t.mocksSub}</p></div>
        <Icon name="right" size={18} />
      </Link>
    </div>
  );
}

/** GitHub-style activity grid for the last 18 weeks. */
export function Heatmap({ state, now }: { state: StudyState; now: Date }) {
  const weeks = 18;
  const end = new Date(now);
  end.setDate(end.getDate() + (6 - end.getDay()));
  const cells: { k: string; xp: number; future: boolean }[] = [];
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const k = dayKey(d);
    cells.push({ k, xp: state.days[k]?.xp ?? 0, future: d > now });
  }
  const lvl = (xp: number) => (xp <= 0 ? 0 : xp < 20 ? 1 : xp < 50 ? 2 : xp < 100 ? 3 : 4);
  return (
    <div className="heatmap" role="img" aria-label="activity">
      {cells.map((c) => <span key={c.k} className={`hm l${c.future ? "x" : lvl(c.xp)}`} title={`${c.k}: ${c.xp} XP`} />)}
    </div>
  );
}
