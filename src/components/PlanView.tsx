"use client";
// The interview plan: a date, a role and the minutes you have → what to do today and each week.
// The plan itself is pure (src/lib/plan.ts); this view adds the reader's progress and remembers
// the three choices in this browser.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { buildPlan, daysBetween, inScope, schedule, MINUTE_OPTIONS, MIN_PER_CONCEPT, REVIEW_SHARE, type DayKind, type Role } from "@/lib/plan";
import { isDue } from "@/lib/practice/store";
import { studyCalendar } from "@/lib/calendar";
import { useStudyState } from "./practice/usePractice";
import { statusOf } from "./Mastered";
import { Seg } from "./labs/ui";
import { Ill } from "./Ill";
import { Icon } from "./Icon";

export interface PlanItem { id: string; t: string; domain: string; level: string; module: string }
interface Saved { date: string; role: Role; minutes: number; /** daily reminder time, HH:MM */ at: string }
const KEY = "fg.plan.v1";
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

const T = {
  en: {
    date: "Interview date", role: "Target role", minutes: "Minutes per day",
    roles: { swe: "Staff SWE", ai: "AI Architect", both: "Both" },
    pick: "Pick your interview date to get a day-by-day plan. No date yet? Choose one 6–8 weeks out and adjust later.",
    past: "That date has passed. Pick a new one.", today: "The interview is today. No new material: skim your cheatsheet and your stories, and trust the work.",
    left: (n: number) => (n === 1 ? "1 day left" : `${n} days left`),
    fits: (n: number) => `It fits: ${n} new concept${n === 1 ? "" : "s"} per study day covers everything for this role.`,
    tight: (reach: number, total: number, cap: number) => `Not everything fits: at ${cap} a day you reach ${reach} of the ${total} concepts left. The plan puts the essentials and the design cases first.`,
    more: "More minutes per day, or a later date, would cover the rest.",
    doneAll: "You have studied every concept for this role. From here: reviews and mocks.",
    todayTitle: "Today", kind: { learn: "Study day", practice: "Practice day", final: "Rehearsal day", eve: "The day before" } as Record<DayKind, string>,
    review: (n: number) => (n ? `Review ${n} due item${n === 1 ? "" : "s"}` : "Daily review"), reviewSub: "Spaced repetition: what you are about to forget.",
    learn: (k: number, n: number) => `New concepts · ${k}/${n} done today`, goalMet: "Today's goal met. Anything below is a head start.",
    mockCode: "Mock coding interview", mockCodeSub: "Two problems, 45 minutes, no hints.", oneCode: "One coding problem", oneCodeSub: "Pick a pattern you have studied.",
    design: "System design round", designSub: "A timed 45-minute mock with a rubric.", stories: "STAR stories drill", storiesSub: "Answer one behavioral question in two minutes.",
    weak: "Weak points", weakSub: "What you missed or are close to forgetting.", sheet: "Cheatsheet", sheetSub: "One last skim. Then rest: sleep is part of the prep.",
    weeks: "The road to your interview", week: (n: number) => `Week ${n}`, concepts: (n: number) => `${n} concept${n === 1 ? "" : "s"}`,
    rehearsal: "Rehearsal", rehearsalSub: "No new material: mocks, weak points and stories.", practiceDays: (n: number) => `${n} practice day${n === 1 ? "" : "s"}`,
    later: (n: number) => `Left for later (${n})`, laterSub: "Lower priority for an interview: study these if you get ahead.",
    assume: `The pace assumes about ${MIN_PER_CONCEPT} minutes per new concept and ${Math.round(REVIEW_SHARE * 100)}% of each study day for review.`,
    reset: "Clear plan",
    remind: "Daily reminder", remindSub: "A study block every day at this time, until the day before the interview, plus the interview day. Your calendar app does the reminding.", addCal: "Add to calendar",
  },
  es: {
    date: "Fecha de la entrevista", role: "Rol objetivo", minutes: "Minutos al día",
    roles: { swe: "Staff SWE", ai: "AI Architect", both: "Ambos" },
    pick: "Elige la fecha de tu entrevista y te armo un plan día a día. ¿Aún sin fecha? Pon una a 6–8 semanas y ajústala después.",
    past: "Esa fecha ya pasó. Elige una nueva.", today: "La entrevista es hoy. Nada nuevo: repasa tu cheatsheet y tus historias, y confía en el trabajo hecho.",
    left: (n: number) => (n === 1 ? "Falta 1 día" : `Faltan ${n} días`),
    fits: (n: number) => `Alcanza: con ${n} concepto${n === 1 ? "" : "s"} nuevo${n === 1 ? "" : "s"} por día de estudio cubres todo lo de este rol.`,
    tight: (reach: number, total: number, cap: number) => `No alcanza todo: a ${cap} por día llegas a ${reach} de los ${total} conceptos que faltan. El plan pone primero lo esencial y los casos de diseño.`,
    more: "Con más minutos al día, o una fecha más lejana, cubrirías el resto.",
    doneAll: "Ya estudiaste todos los conceptos de este rol. Desde aquí: repasos y simulacros.",
    todayTitle: "Hoy", kind: { learn: "Día de estudio", practice: "Día de práctica", final: "Día de ensayo", eve: "El día anterior" } as Record<DayKind, string>,
    review: (n: number) => (n ? `Repasa ${n} ítem${n === 1 ? "" : "s"} pendiente${n === 1 ? "" : "s"}` : "Repaso del día"), reviewSub: "Repaso espaciado: lo que estás por olvidar.",
    learn: (k: number, n: number) => `Conceptos nuevos · llevas ${k}/${n} hoy`, goalMet: "Meta de hoy cumplida. Lo de abajo es adelantar.",
    mockCode: "Simulacro de coding", mockCodeSub: "Dos problemas, 45 minutos, sin pistas.", oneCode: "Un problema de coding", oneCodeSub: "Elige un patrón que ya estudiaste.",
    design: "Ronda de system design", designSub: "Un simulacro cronometrado de 45 minutos con rúbrica.", stories: "Práctica de historias STAR", storiesSub: "Responde una pregunta conductual en dos minutos.",
    weak: "Puntos débiles", weakSub: "Lo que fallaste o estás por olvidar.", sheet: "Cheatsheet", sheetSub: "Una última pasada. Después descansa: dormir es parte de la preparación.",
    weeks: "El camino a tu entrevista", week: (n: number) => `Semana ${n}`, concepts: (n: number) => `${n} concepto${n === 1 ? "" : "s"}`,
    rehearsal: "Ensayo", rehearsalSub: "Nada nuevo: simulacros, puntos débiles e historias.", practiceDays: (n: number) => `${n} día${n === 1 ? "" : "s"} de práctica`,
    later: (n: number) => `Queda para después (${n})`, laterSub: "Menor prioridad para una entrevista: estúdialos si te adelantas.",
    assume: `El ritmo supone unos ${MIN_PER_CONCEPT} minutos por concepto nuevo y un ${Math.round(REVIEW_SHARE * 100)}% de cada día de estudio para repasar.`,
    reset: "Borrar plan",
    remind: "Recordatorio diario", remindSub: "Un bloque de estudio cada día a esta hora, hasta el día antes de la entrevista, más el día de la entrevista. Tu app de calendario te avisa.", addCal: "Agregar al calendario",
  },
};

export function PlanView({ items, locale }: { items: PlanItem[]; locale: Locale }) {
  const t = T[locale];
  const [s] = useStudyState();
  const [cfg, setCfg] = useState<Saved>({ date: "", role: "swe", minutes: 60, at: "19:00" });
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
    try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (v?.role) setCfg({ date: v.date ?? "", role: v.role, minutes: v.minutes ?? 60, at: /^\d\d:\d\d$/.test(v.at ?? "") ? v.at : "19:00" }); } catch { /* ignore */ }
  }, []);
  const set = (patch: Partial<Saved>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const daysLeft = today && cfg.date ? daysBetween(today, parse(cfg.date)) : null;
  const plan = useMemo(() => (daysLeft !== null && daysLeft > 0 && s
    ? buildPlan({ daysLeft, role: cfg.role, minutes: cfg.minutes, concepts: items, studied: (id) => statusOf(s, id) !== "none" })
    : null), [daysLeft, cfg.role, cfg.minutes, items, s]);

  const form = (
    <div className="plan-form">
      <label className="plan-date"><span className="ls-label">{t.date}</span>
        <input type="date" value={cfg.date} min={today ? iso(today) : undefined} onChange={(e) => set({ date: e.target.value })} />
      </label>
      <Seg label={t.role} value={cfg.role} onChange={(role) => set({ role })} options={(["swe", "ai", "both"] as const).map((r) => ({ value: r, label: t.roles[r] }))} />
      <Seg label={t.minutes} value={cfg.minutes} onChange={(minutes) => set({ minutes })} options={MINUTE_OPTIONS.map((m) => ({ value: m, label: String(m) }))} />
    </div>
  );

  if (!today || daysLeft === null || daysLeft < 0 || !s) return <div className="plan">{form}<p className="plan-msg">{daysLeft !== null && daysLeft < 0 ? t.past : t.pick}</p></div>;
  if (daysLeft === 0 || !plan) return (
    <div className="plan">{form}
      <p className="plan-msg">{t.today}</p>
      <div className="plan-acts"><Act href={`/${locale}/cheatsheet/`} icon="list" title={t.sheet} sub={t.sheetSub} /><Act href={`/${locale}/interview/stories/`} icon="mic" title={t.stories} sub={t.storiesSub} /></div>
    </div>
  );

  const now = today;
  const due = Object.values(s.cards).filter((c) => isDue(c, now)).length;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const inScopeIds = new Set([...plan.queue, ...plan.later]);
  // Read today and part of this role's scope (they are no longer in the queue, so count them apart).
  const doneToday = items.filter((i) => !inScopeIds.has(i.id) && (s.read[i.id] ?? 0) >= startOfDay && inScope(cfg.role, i)).length;
  const kind = plan.days[0];
  const target = kind === "learn" ? plan.perDay : 0;
  const todo = plan.queue.slice(0, Math.max(plan.perDay, 1));
  const sched = schedule(plan);
  const weeks = chunkWeeks(plan.days, sched);
  const fmt = (offset: number) => new Date(startOfDay + offset * 86_400_000).toLocaleDateString(locale, { day: "numeric", month: "short" });
  const wantsCode = cfg.role !== "ai";

  return (
    <div className="plan">
      {form}
      <div className={`plan-verdict${plan.fits || !plan.remaining ? "" : " tight"}`}>
        <strong>{t.left(daysLeft)}</strong>
        <span>{!plan.remaining ? t.doneAll : plan.fits ? t.fits(plan.perDay) : `${t.tight(plan.queue.length, plan.remaining, plan.capacity)} ${t.more}`}</span>
      </div>
      <Reminder cfg={cfg} today={now} locale={locale} onTime={(at) => set({ at })} />

      <section className="plan-today">
        <h2><span className="hub-label">{t.todayTitle}</span>{t.kind[kind]}</h2>
        <div className="plan-acts">
          {kind !== "eve" && <Act href={`/${locale}/practice/play/?mode=daily`} icon="cycle" title={t.review(due)} sub={t.reviewSub} />}
          {kind === "practice" && (wantsCode
            ? <Act href={`/${locale}/practice/code/mock/`} icon="code" title={t.mockCode} sub={t.mockCodeSub} />
            : <Act href={`/${locale}/practice/design/`} icon="server" title={t.design} sub={t.designSub} />)}
          {kind === "practice" && wantsCode && <Act href={`/${locale}/practice/design/`} icon="server" title={t.design} sub={t.designSub} />}
          {kind === "final" && <Act href={`/${locale}/practice/design/`} icon="server" title={t.design} sub={t.designSub} />}
          {kind === "final" && wantsCode && <Act href={`/${locale}/practice/code/mock/`} icon="code" title={t.mockCode} sub={t.mockCodeSub} />}
          {kind === "final" && <Act href={`/${locale}/practice/play/?mode=weak`} icon="zap" title={t.weak} sub={t.weakSub} />}
          {(kind === "practice" || kind === "final" || kind === "eve") && <Act href={`/${locale}/interview/stories/`} icon="mic" title={t.stories} sub={t.storiesSub} />}
          {kind === "eve" && <Act href={`/${locale}/cheatsheet/`} icon="list" title={t.sheet} sub={t.sheetSub} />}
        </div>
        {kind === "learn" && todo.length > 0 && (
          <>
            <h3 className="section-label">{t.learn(Math.min(doneToday, target), target)}</h3>
            {doneToday >= target && <p className="plan-ok">✓ {t.goalMet}</p>}
            <ul className="plan-list">
              {todo.map((id) => { const c = byId.get(id)!; return (
                <li key={id}><Link href={`/${locale}/c/${id}/`}><Ill id={id} size={30} /><span><strong>{c.t}</strong><small>{c.module}</small></span><Icon name="right" size={16} /></Link></li>
              ); })}
            </ul>
            {wantsCode && <div className="plan-acts"><Act href={`/${locale}/practice/code/`} icon="code" title={t.oneCode} sub={t.oneCodeSub} /></div>}
          </>
        )}
      </section>

      <section className="plan-weeks">
        <h2 className="section-label">{t.weeks}</h2>
        <ol>
          {weeks.map((w, i) => {
            const ids = w.ids;
            const mods = [...new Set(ids.map((id) => byId.get(id)!.module))];
            const rehearsal = w.kinds.every((k) => k === "final" || k === "eve");
            const practice = w.kinds.filter((k) => k === "practice").length;
            return (
              <li key={i} className={rehearsal ? "rehearsal" : undefined}>
                <div className="pw-head"><strong>{rehearsal ? t.rehearsal : t.week(i + 1)}</strong><span>{fmt(w.from)} – {fmt(w.to)}</span></div>
                {rehearsal ? <p>{t.rehearsalSub}</p> : (
                  <p>{t.concepts(ids.length)}{practice ? ` · ${t.practiceDays(practice)}` : ""}{w.kinds.some((k) => k === "final") ? ` · ${t.rehearsal.toLowerCase()}` : ""}{mods.length ? <><br /><small>{mods.slice(0, 4).join(" · ")}{mods.length > 4 ? " …" : ""}</small></> : null}</p>
                )}
              </li>
            );
          })}
        </ol>
        {plan.later.length > 0 && (
          <details className="fold-mini">
            <summary>{t.later(plan.later.length)}</summary>
            <p className="lab-note">{t.laterSub}</p>
            <p className="plan-later">{plan.later.map((id, i) => <span key={id}>{i ? " · " : ""}<Link href={`/${locale}/c/${id}/`}>{byId.get(id)!.t}</Link></span>)}</p>
          </details>
        )}
        <p className="lab-note">{t.assume}</p>
        <button type="button" className="link-btn" onClick={() => set({ date: "" })}>{t.reset}</button>
      </section>
    </div>
  );
}

/** The plan as a calendar file: the reminder is the calendar's own alarm (src/lib/calendar.ts). */
function Reminder({ cfg, today, locale, onTime }: { cfg: Saved; today: Date; locale: Locale; onTime: (at: string) => void }) {
  const t = T[locale];
  const download = () => {
    const [h, m] = cfg.at.split(":").map(Number);
    // Today's block only if its time has not passed yet.
    const first = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (today.getHours() * 60 + today.getMinutes() < h * 60 + m ? 0 : 1));
    const ics = studyCalendar({ from: iso(first), interview: cfg.date, at: cfg.at, minutes: cfg.minutes, locale, origin: window.location.origin });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "levelup-plan.ics" });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  return (
    <div className="plan-remind">
      <div><strong>📅 {t.remind}</strong><span>{t.remindSub}</span></div>
      <div className="plan-remind-row">
        <input type="time" aria-label={t.remind} value={cfg.at} onChange={(e) => e.target.value && onTime(e.target.value)} />
        <button type="button" className="btn" onClick={download}><Icon name="calendar" size={18} /> {t.addCal}</button>
      </div>
    </div>
  );
}

/** Group the days into calendar-length weeks counted from today. */
function chunkWeeks(days: DayKind[], sched: string[][]) {
  const out: { from: number; to: number; kinds: DayKind[]; ids: string[] }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const kinds = days.slice(i, i + 7);
    out.push({ from: i, to: i + kinds.length - 1, kinds, ids: sched.slice(i, i + 7).flat() });
  }
  return out;
}

function Act({ href, icon, title, sub }: { href: string; icon: string; title: string; sub: string }) {
  return (
    <Link href={href} className="plan-act">
      <Icon name={icon} size={20} />
      <span><strong>{title}</strong><small>{sub}</small></span>
      <Icon name="right" size={16} />
    </Link>
  );
}
