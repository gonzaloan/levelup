"use client";
// Per-concept study status in lists and pages, read from the practice state (local-first).
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { m } from "@/lib/i18n";
import { useStudyState } from "./practice/usePractice";
import type { StudyState } from "@/lib/practice/store";
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

/** Concept page actions: practice it now, and mark it read (it enters the daily review). */
export function MasteredToggle({ id, locale }: { id: string; locale: Locale; label?: string; doneLabel?: string }) {
  const [s, update] = useStudyState();
  const read = !!s?.read[id];
  return (
    <div className="concept-actions">
      <a className="btn btn-primary" href={`/${locale}/practice/play/?mode=concept&id=${id}`}><Icon name="cards" size={16} /> {m("pPracticeConcept", locale)}</a>
      <button type="button" className={`mastered-btn${read ? " on" : ""}`} aria-pressed={read}
        onClick={() => update((st) => { if (st.read[id]) delete st.read[id]; else st.read[id] = Date.now(); })}>
        <Icon name="check" size={16} />
        <span>{read ? m("pIsRead", locale) : m("pMarkRead", locale)}</span>
      </button>
      <Link href={`/${locale}/practice/`} className="link-btn">{m("pHubTitle", locale)} →</Link>
    </div>
  );
}
