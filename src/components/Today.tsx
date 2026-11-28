"use client";
// Hoy: today's mission (learn one concept, review, the Gym) with one big button for the next
// unfinished task, the streak and level in one line, and your place on the path. The mission logic
// is pure (src/lib/today.ts); this reads the reader's local state.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { useStudyState } from "./practice/usePractice";
import { dayKey, isDue, levelOf, streakOf, totalXp } from "@/lib/practice/store";
import { loadGym, today as gymToday } from "@/lib/gym/store";
import { isToday, missionOf, type TaskId } from "@/lib/today";
import { Icon } from "./Icon";

export interface PathStop { id: string; t: string; m: string }

const T = {
  en: { mission: "Today's mission", dayDone: "Day complete 🔥", dayDoneSub: "Come back tomorrow to keep your streak. Want more? Practice anything.", more: "Practice more",
    learn: "Learn a concept", learnHow: "read it and answer “Check yourself”", review: "Review", dueSub: (n: number) => `${n} due · what you're about to forget`, freshSub: "New cards from what you've read, ~5 min", reviewedSub: (n: number) => `${n} card${n === 1 ? "" : "s"} reviewed today`, gym: "Gym", gymSub: "8 reps by hand, ~12 min", gymDoneSub: (p: number) => `Done today · ${p}%`,
    locked: "After your first concept", go: { learn: "Learn now", review: "Review now", gym: "Go to the Gym" } as Record<TaskId, string>,
    level: "Level", streak: (n: number) => `${n}-day streak`, path: "Your path", pathDone: "Path complete!", studied: "studied" },
  es: { mission: "Misión de hoy", dayDone: "Día completo 🔥", dayDoneSub: "Vuelve mañana para mantener tu racha. ¿Quieres más? Practica lo que quieras.", more: "Practicar más",
    learn: "Aprende un concepto", learnHow: "léelo y responde «Pruébate»", review: "Repasa", dueSub: (n: number) => `${n} pendiente${n === 1 ? "" : "s"} · lo que estás por olvidar`, freshSub: "Tarjetas nuevas de lo que leíste, ~5 min", reviewedSub: (n: number) => `${n} tarjeta${n === 1 ? "" : "s"} repasada${n === 1 ? "" : "s"} hoy`, gym: "Gimnasio", gymSub: "8 ejercicios a mano, ~12 min", gymDoneSub: (p: number) => `Hecho hoy · ${p} %`,
    locked: "Tras tu primer concepto", go: { learn: "Aprender ahora", review: "Repasar ahora", gym: "Ir al Gimnasio" } as Record<TaskId, string>,
    level: "Nivel", streak: (n: number) => `Racha de ${n} día${n === 1 ? "" : "s"}`, path: "Tu ruta", pathDone: "¡Ruta completa!", studied: "estudiados" },
};
const ICON: Record<TaskId, string> = { learn: "book", review: "cycle", gym: "zap" };

export function Today({ order, locale }: { order: PathStop[]; locale: Locale }) {
  const t = T[locale];
  const [s] = useStudyState();
  // Today's workout score when it is done (null until then).
  const [gymScore, setGymScore] = useState<number | null>(null);
  useEffect(() => { const d = loadGym().days[gymToday()]; setGymScore(d?.done ? d.score : null); }, []);
  const gymDone = gymScore !== null;
  const now = useMemo(() => new Date(), []);

  const view = useMemo(() => {
    if (!s) return null;
    const practiced = new Set(Object.keys(s.cards).map((k) => k.slice(0, k.indexOf("."))));
    const idx = order.findIndex((c) => !s.read[c.id] && !practiced.has(c.id));
    // Once today's concept is learned, its row shows what you learned, not the next one.
    const learned = order.filter((c) => isToday(s.read[c.id], now)).sort((a, b) => s.read[b.id] - s.read[a.id])[0] ?? null;
    const next = idx >= 0 ? order[idx] : null;
    const cards = Object.values(s.cards);
    const due = cards.filter((c) => isDue(c, now)).length;
    const mission = missionOf({
      learnedToday: Object.values(s.read).some((ms) => isToday(ms, now)),
      canReview: cards.length > 0 || Object.keys(s.read).length > 0, due, gymDone,
      reviewedToday: cards.filter((c) => isToday(c.last_review, now)).length,
      reviewSessionDone: (s.days[dayKey(now)]?.rs ?? 0) > 0,
    });
    // The module you're in: its stops in order and how many you've done.
    const mod = next ? order.filter((c) => c.m === next.m) : [];
    const modDone = mod.filter((c) => s.read[c.id] || practiced.has(c.id)).length;
    const xp = totalXp(s);
    // "x/N" means studied (read or practiced), the same count Ruta and Tú show.
    const studied = order.filter((c) => s.read[c.id] || practiced.has(c.id)).length;
    return { next, learned, studied, due, reviewed: cards.filter((c) => isToday(c.last_review, now)).length, mission, mod, modDone, xp, lvl: levelOf(xp), streak: streakOf(s, now).days };
  }, [s, order, now, gymDone]);

  if (!view) return <div className="today-card skeleton" aria-busy="true" />;
  const { next, learned, mission } = view;
  const learnDone = mission.tasks[0].state === "done";
  const href: Record<TaskId, string> = {
    learn: learnDone && learned ? `/${locale}/c/${learned.id}/` : next ? `/${locale}/c/${next.id}/` : `/${locale}/path/`,
    review: `/${locale}/practice/play/?mode=daily`,
    gym: `/${locale}/gym/`,
  };
  const label = (id: TaskId) => (id === "learn" ? t.learn : id === "review" ? t.review : t.gym);
  const sub = (id: TaskId, locked: boolean) => (locked ? t.locked
    : id === "learn" ? (learnDone && learned ? learned.t : next ? (view.studied ? next.t : `${next.t} · ${t.learnHow}`) : t.pathDone)
    : id === "review" ? (mission.tasks[1].state === "done" ? t.reviewedSub(view.reviewed) : view.due ? t.dueSub(view.due) : t.freshSub) : gymScore !== null ? t.gymDoneSub(Math.round(gymScore * 100)) : t.gymSub);

  return (
    <>
      <section className="today-card" aria-labelledby="mission">
        <div className="today-top">
          <h2 id="mission">{mission.next ? t.mission : t.dayDone}</h2>
          <span className="today-count" aria-label={`${mission.done}/3`}>{mission.done}/3</span>
        </div>
        {view.xp > 0 && (
          <p className="today-meta">
            {view.streak > 0 && <span>🔥 {t.streak(view.streak)}</span>}
            <span>{t.level} {view.lvl.index + 1} · {locale === "es" ? view.lvl.es : view.lvl.en}</span>
          </p>
        )}
        <ol className="today-tasks">
          {mission.tasks.map((task) => {
            const locked = task.state === "locked", isNext = task.id === mission.next;
            const body = (
              <>
                <span className={`tt-mark ${task.state}`} aria-hidden="true">{task.state === "done" ? <Icon name="check" size={16} /> : locked ? "🔒" : <Icon name={ICON[task.id]} size={16} />}</span>
                <span className="tt-text"><strong>{label(task.id)}</strong><small>{sub(task.id, locked)}</small></span>
                {!locked && task.state !== "done" && <Icon name="right" size={16} />}
              </>
            );
            return (
              <li key={task.id} className={`tt ${task.state}${isNext ? " next" : ""}`}>
                {locked ? <div className="tt-row">{body}</div> : <Link className="tt-row" href={href[task.id]}>{body}</Link>}
              </li>
            );
          })}
        </ol>
        {mission.next
          ? <Link className="btn btn-primary today-go" href={href[mission.next]}><span>{t.go[mission.next]}</span> <Icon name="right" size={18} /></Link>
          : <><p className="today-sub">{t.dayDoneSub}</p><Link className="btn today-go" href={`/${locale}/practice/`}>{t.more} <Icon name="right" size={18} /></Link></>}
      </section>

      <Link className="today-path" href={`/${locale}/path/`}>
        <span className="hub-label">{t.path} · {view.studied}/{order.length} {t.studied}</span>
        <strong>{next ? next.m : t.pathDone}</strong>
        {next && <span className="today-bar" aria-hidden="true"><span style={{ width: `${Math.round((100 * view.modDone) / Math.max(1, view.mod.length))}%` }} /></span>}
        {next && <small>{view.modDone}/{view.mod.length}</small>}
      </Link>
    </>
  );
}
