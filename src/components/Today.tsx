"use client";
// Hoy: today's mission (learn one concept, review, the Gym) with one big button for the next
// unfinished task, the streak and level in one line, and your place on the path. The mission logic
// is pure (src/lib/today.ts); this reads the reader's local state.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { useStudyState } from "./practice/usePractice";
import { isDue, levelOf, streakOf, totalXp } from "@/lib/practice/store";
import { loadGym, today as gymToday } from "@/lib/gym/store";
import { isToday, missionOf, type TaskId } from "@/lib/today";
import { Icon } from "./Icon";

export interface PathStop { id: string; t: string; m: string }

const T = {
  en: { mission: "Today's mission", dayDone: "Day complete 🔥", dayDoneSub: "Come back tomorrow to keep your streak. Want more? Practice anything.", more: "Practice more",
    learn: "Learn a concept", review: (n: number) => (n ? `Review ${n} card${n === 1 ? "" : "s"}` : "Review"), reviewSub: "What you're about to forget", gym: "Gym", gymSub: "8 reps by hand, ~12 min",
    locked: "Unlocks after your first concept", go: { learn: "Start", review: "Review now", gym: "Go to the Gym" } as Record<TaskId, string>,
    level: "Level", streak: (n: number) => `${n}-day streak`, noStreak: "No streak yet", path: "Your path", pathDone: "Path complete!", see: "See the path" },
  es: { mission: "Misión de hoy", dayDone: "Día completo 🔥", dayDoneSub: "Vuelve mañana para mantener tu racha. ¿Quieres más? Practica lo que quieras.", more: "Practicar más",
    learn: "Aprende un concepto", review: (n: number) => (n ? `Repasa ${n} tarjeta${n === 1 ? "" : "s"}` : "Repasa"), reviewSub: "Lo que estás por olvidar", gym: "Gimnasio", gymSub: "8 ejercicios a mano, ~12 min",
    locked: "Se desbloquea con tu primer concepto", go: { learn: "Empezar", review: "Repasar ahora", gym: "Ir al Gimnasio" } as Record<TaskId, string>,
    level: "Nivel", streak: (n: number) => `Racha de ${n} día${n === 1 ? "" : "s"}`, noStreak: "Sin racha todavía", path: "Tu ruta", pathDone: "¡Ruta completa!", see: "Ver la ruta" },
};
const ICON: Record<TaskId, string> = { learn: "book", review: "cycle", gym: "zap" };

export function Today({ order, locale }: { order: PathStop[]; locale: Locale }) {
  const t = T[locale];
  const [s] = useStudyState();
  const [gymDone, setGymDone] = useState(false);
  useEffect(() => { setGymDone(!!loadGym().days[gymToday()]?.done); }, []);
  const now = useMemo(() => new Date(), []);

  const view = useMemo(() => {
    if (!s) return null;
    const practiced = new Set(Object.keys(s.cards).map((k) => k.slice(0, k.indexOf("."))));
    const idx = order.findIndex((c) => !s.read[c.id] && !practiced.has(c.id));
    const next = idx >= 0 ? order[idx] : null;
    const cards = Object.values(s.cards);
    const due = cards.filter((c) => isDue(c, now)).length;
    const mission = missionOf({
      learnedToday: Object.values(s.read).some((ms) => isToday(ms, now)),
      hasCards: cards.length > 0, due, gymDone,
      reviewedToday: cards.some((c) => isToday(c.last_review, now)),
    });
    // The module you're in: its stops in order and how many you've done.
    const mod = next ? order.filter((c) => c.m === next.m) : [];
    const modDone = mod.filter((c) => s.read[c.id] || practiced.has(c.id)).length;
    const xp = totalXp(s);
    return { next, idx: idx < 0 ? order.length : idx, due, mission, mod, modDone, lvl: levelOf(xp), streak: streakOf(s, now).days };
  }, [s, order, now, gymDone]);

  if (!view) return <div className="today-card skeleton" aria-busy="true" />;
  const { next, mission } = view;
  const href: Record<TaskId, string> = {
    learn: next ? `/${locale}/c/${next.id}/` : `/${locale}/path/`,
    review: `/${locale}/practice/play/?mode=daily`,
    gym: `/${locale}/gym/`,
  };
  const label = (id: TaskId) => (id === "learn" ? t.learn : id === "review" ? t.review(view.due) : t.gym);
  const sub = (id: TaskId, locked: boolean) => (locked ? t.locked : id === "learn" ? next?.t ?? t.pathDone : id === "review" ? t.reviewSub : t.gymSub);

  return (
    <>
      <section className="today-card" aria-labelledby="mission">
        <div className="today-top">
          <h2 id="mission">{mission.next ? t.mission : t.dayDone}</h2>
          <span className="today-count" aria-label={`${mission.done}/3`}>{mission.done}/3</span>
        </div>
        <p className="today-meta">
          <span>🔥 {view.streak ? t.streak(view.streak) : t.noStreak}</span>
          <span>{t.level} {view.lvl.index + 1} · {locale === "es" ? view.lvl.es : view.lvl.en}</span>
        </p>
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
          ? <Link className="btn btn-primary today-go" href={href[mission.next]}>{t.go[mission.next]} <Icon name="right" size={18} /></Link>
          : <><p className="today-sub">{t.dayDoneSub}</p><Link className="btn today-go" href={`/${locale}/practice/`}>{t.more} <Icon name="right" size={18} /></Link></>}
      </section>

      <Link className="today-path" href={`/${locale}/path/`}>
        <span className="hub-label">{t.path} · {view.idx}/{order.length}</span>
        <strong>{next ? next.m : t.pathDone}</strong>
        {next && <span className="today-bar" aria-hidden="true"><span style={{ width: `${Math.round((100 * view.modDone) / Math.max(1, view.mod.length))}%` }} /></span>}
        {next && <small>{view.modDone}/{view.mod.length}</small>}
        <span className="today-see">{t.see} <Icon name="right" size={14} /></span>
      </Link>
    </>
  );
}
