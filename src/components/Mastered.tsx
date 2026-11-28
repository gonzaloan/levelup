"use client";
// Per-concept study status in lists and pages, read from the practice state (local-first).
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { m } from "@/lib/i18n";
import { useStudyState } from "./practice/usePractice";
import type { StudyState } from "@/lib/practice/store";
import { isToday } from "@/lib/today";
import { Icon } from "./Icon";

type Status = "none" | "read" | "practiced" | "solid";
export function statusOf(s: StudyState | null, id: string): Status {
  if (!s) return "none";
  const cards = Object.entries(s.cards).filter(([k]) => k.startsWith(id + ".") && !k.includes(".iq")).map(([, v]) => v);
  if (cards.length >= 2 && cards.every((c) => c.stability >= 7)) return "solid";
  if (cards.length) return "practiced";
  return s.read[id] ? "read" : "none";
}

/** Dot in concept lists: empty → read → practiced → solid (stable ≥ 1 week). */
export function MasteredDot({ id }: { id: string }) {
  const [s] = useStudyState();
  const st = statusOf(s, id);
  return <span className={`dot st-${st}`} aria-hidden="true" />;
}

/** "n/N studied" + bar for a set of concepts. */
export function ProgressMeter({ ids, label }: { ids: string[]; label: string }) {
  const [s] = useStudyState();
  const n = ids.filter((id) => statusOf(s, id) !== "none").length;
  const pct = ids.length ? Math.round((100 * n) / ids.length) : 0;
  return (
    <div className="meter" title={`${n}/${ids.length} ${label}`}>
      <div className="meter-bar"><span style={{ width: `${pct}%` }} /></div>
      <span className="meter-text">{n}/{ids.length} {label}</span>
    </div>
  );
}

/** End of a concept page: one primary step. Learned today → back to today's mission; otherwise the
 *  next concept on the path. "Mark as read" is the quiet secondary (it enters the daily review). */
export function ConceptEnd({ id, locale, next }: { id: string; locale: Locale; next: Stop | null }) {
  const [s, update] = useStudyState();
  const read = !!s?.read[id];
  const today = read && isToday(s!.read[id], new Date());
  const es = locale === "es";
  return (
    <nav className="concept-end" aria-label={es ? "Siguiente paso" : "Next step"}>
      {today && <p className="ce-done"><Icon name="check" size={16} /> {es ? "Lo aprendiste hoy: entra a tu repaso." : "Learned today: it joins your review."}</p>}
      {today
        ? <Link className="btn btn-primary ce-go" href={`/${locale}/`}>{es ? "Seguir con tu día" : "Continue your day"} <Icon name="right" size={18} /></Link>
        : next && <Link className="btn btn-primary ce-go" href={`/${locale}/c/${next.id}/`}><span><small>{es ? "Siguiente en tu ruta" : "Next on your path"}</small>{next.title}</span><Icon name="right" size={18} /></Link>}
      <button type="button" className={`mastered-btn${read ? " on" : ""}`} aria-pressed={read}
        onClick={() => update((st) => { if (st.read[id]) delete st.read[id]; else st.read[id] = Date.now(); })}>
        <Icon name="check" size={16} />
        <span>{read ? m("pIsRead", locale) : m("pMarkRead", locale)}</span>
      </button>
      {today && next && <Link className="link-btn ce-next" href={`/${locale}/c/${next.id}/`}>{es ? "Siguiente concepto" : "Next concept"}: {next.title} <Icon name="right" size={14} /></Link>}
    </nav>
  );
}
type Stop = { id: string; title: string };
