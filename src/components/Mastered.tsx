"use client";
// Per-concept study status in lists and pages, read from the practice state (local-first).
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { useStudyState } from "./practice/usePractice";
import { learn, LEARN_XP, type StudyState } from "@/lib/practice/store";
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

/** End of a concept page: one primary step.
 *  Unread → "Done reading" (marks it, pays XP, and shows the reward right here).
 *  Learned today → back to today's mission (a full load, so Hoy opens at the top with its new count).
 *  Read before → the next concept on the path. Read is never unset here: it would undo the day. */
export function ConceptEnd({ id, locale, next }: { id: string; locale: Locale; next: Stop | null }) {
  const [s, update] = useStudyState();
  const es = locale === "es";
  if (!s) return <nav className="concept-end" aria-busy="true" />;
  const read = !!s.read[id];
  const today = read && isToday(s.read[id], new Date());
  return (
    <nav className="concept-end" aria-label={es ? "Siguiente paso" : "Next step"}>
      {!read && (
        <button type="button" className="btn btn-primary ce-go ce-mark" onClick={() => update((st) => { learn(st, id, new Date()); })}>
          <span>{es ? "Listo, lo leí" : "Done reading"}</span><Icon name="check" size={18} />
        </button>
      )}
      {today && <p className="ce-done" role="status"><Icon name="check" size={16} /> {es ? `Lo aprendiste hoy (+${LEARN_XP} XP). Ya está en tu repaso.` : `Learned today (+${LEARN_XP} XP). It's in your review now.`}</p>}
      {today && <a className="btn btn-primary ce-go" href={`/${locale}/`}><span>{es ? "Seguir con tu día" : "Continue your day"}</span><Icon name="right" size={18} /></a>}
      {read && !today && next && <Link className="btn btn-primary ce-go" href={`/${locale}/c/${next.id}/`}><span><small>{es ? "Siguiente en tu ruta" : "Next on your path"}</small>{next.title}</span><Icon name="right" size={18} /></Link>}
      {(today || !read) && next && <Link className="link-btn ce-next" href={`/${locale}/c/${next.id}/`}>{es ? "Siguiente concepto" : "Next concept"}: {next.title} <Icon name="right" size={14} /></Link>}
    </nav>
  );
}
type Stop = { id: string; title: string };
