"use client";
// Tú: your progress in one place (level, streak, activity), your interview date, and the backup
// tools. Everything here is read from this browser (and synced, if signed in).
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { dayKey, emptyState, levelOf, merge, saveState, streakOf, totalXp, type StudyState } from "@/lib/practice/store";
import { useStudyState } from "./practice/usePractice";
import { Heatmap } from "./practice/Hub";
import { Icon } from "./Icon";

const T = {
  en: { level: "Level", xp: "XP", next: (n: number, l: string) => `${n.toLocaleString()} XP to ${l}`, streak: "Streak", forgive: "One missed day a week is forgiven.",
    read: "Concepts", readSub: "studied on your path", activity: "Activity", plan: "Your interview", planSet: (d: string) => `Interview on ${d}: see today's plan`, planNone: "Set your interview date: get a day-by-day plan",
    backupT: "Backup and reset", exportB: "Download backup", importB: "Restore backup", reset: "Reset all progress", resetQ: "Reset all progress? This can't be undone." },
  es: { level: "Nivel", xp: "XP", next: (n: number, l: string) => `${n.toLocaleString()} XP para ${l}`, streak: "Racha", forgive: "Se perdona un día sin estudiar por semana.",
    read: "Conceptos", readSub: "estudiados de tu ruta", activity: "Actividad", plan: "Tu entrevista", planSet: (d: string) => `Entrevista el ${d}: mira el plan de hoy`, planNone: "Pon la fecha de tu entrevista y te armo un plan día a día",
    backupT: "Respaldo y reinicio", exportB: "Descargar respaldo", importB: "Restaurar respaldo", reset: "Borrar todo el progreso", resetQ: "¿Borrar todo el progreso? No se puede deshacer." },
};

export function MeStats({ locale, total }: { locale: Locale; total: number }) {
  const t = T[locale];
  const [s] = useStudyState();
  const now = useMemo(() => new Date(), []);
  const [planDate, setPlanDate] = useState<string | null>(null);
  useEffect(() => { try { setPlanDate(JSON.parse(localStorage.getItem("fg.plan.v1") ?? "null")?.date || null); } catch { /* ignore */ } }, []);
  if (!s) return <div className="me-card skeleton" aria-busy="true" />;
  const xp = totalXp(s), lvl = levelOf(xp), streak = streakOf(s, now).days;
  const read = new Set([...Object.keys(s.read), ...Object.keys(s.cards).map((k) => k.slice(0, k.indexOf(".")))]).size;
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long" });
  return (
    <>
      <section className="me-card me-level">
        <span className="hub-label">{t.level} {lvl.index + 1}</span>
        <strong className="me-big">{locale === "es" ? lvl.es : lvl.en}</strong>
        <span className="today-bar" aria-hidden="true"><span style={{ width: `${Math.round(lvl.progress * 100)}%` }} /></span>
        <small>{xp.toLocaleString()} {t.xp}{lvl.next ? ` · ${t.next(lvl.next.xp - xp, locale === "es" ? lvl.next.es : lvl.next.en)}` : ""}</small>
      </section>
      <div className="me-pair">
        <section className="me-card"><span className="hub-label">{t.streak}</span><strong className="me-big">🔥 {streak}</strong><small>{t.forgive}</small></section>
        <section className="me-card"><span className="hub-label">{t.read}</span><strong className="me-big">{read}<small>/{total}</small></strong><small>{t.readSub}</small></section>
      </div>
      <section className="me-card">
        <span className="hub-label">{t.activity}</span>
        <Heatmap state={s} now={now} />
      </section>
      <Link className="me-card me-link" href={`/${locale}/plan/`}>
        <span className="hub-label">{t.plan}</span>
        <strong>{planDate ? t.planSet(fmt(planDate)) : t.planNone}</strong>
        <Icon name="right" size={16} />
      </Link>
    </>
  );
}

/** Backup and reset, inside Tú's settings. */
export function MeBackup({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [s, update] = useStudyState();
  const file = useRef<HTMLInputElement>(null);
  if (!s) return null;
  const now = new Date();
  const backup = () => {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([JSON.stringify(s)], { type: "application/json" })), download: `levelup-progress-${dayKey(now)}.json` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const restore = (f: File) => f.text().then((txt) => { try { const inc = JSON.parse(txt) as StudyState; if (inc?.v === 1) update((x) => Object.assign(x, merge(x, inc))); } catch { /* ignore */ } });
  return (
    <details className="me-fold">
      <summary>{t.backupT}</summary>
      <div className="me-backup">
        <button type="button" className="btn" onClick={backup}>{t.exportB}</button>
        <button type="button" className="btn" onClick={() => file.current?.click()}>{t.importB}</button>
        <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && void restore(e.target.files[0])} />
        <button type="button" className="link-btn" onClick={() => { if (confirm(t.resetQ)) { saveState(emptyState()); location.reload(); } }}>{t.reset}</button>
      </div>
    </details>
  );
}
