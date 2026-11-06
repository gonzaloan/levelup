"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Locale, QADoc } from "@/lib/types";
import { getCards, gradeCard, resetCards, PROGRESS_EVENT } from "@/lib/progress";
import { Icon } from "./Icon";

const loaders: Record<Locale, () => Promise<{ default: QADoc[] }>> = {
  en: () => import("@/generated/qa-en.json") as Promise<{ default: QADoc[] }>,
  es: () => import("@/generated/qa-es.json") as Promise<{ default: QADoc[] }>,
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Tiny inline markdown for card text: **bold**, `code`, *em*, [[id]]. */
export const inlineMd = (s: string) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[\[([a-z0-9-]+)\]\]/g, "$1")
    .replace(/\n\n/g, "<br/><br/>");

type Labels = Record<"reveal" | "gotIt" | "again" | "skip" | "openConcept" | "deck" | "reviewed" | "reset" | "all" | "questions", string>;

export function Flashcards({ locale, domains, labels }: {
  locale: Locale;
  domains: { id: string; title: string; hue: number }[];
  labels: Labels;
}) {
  const [all, setAll] = useState<QADoc[] | null>(null);
  const [boxes, setBoxes] = useState<Record<string, number>>({});
  const [dom, setDom] = useState("");
  const [cur, setCur] = useState<QADoc | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => { loaders[locale]().then((m) => setAll(m.default)); }, [locale]);
  useEffect(() => {
    const sync = () => setBoxes(getCards());
    sync();
    window.addEventListener(PROGRESS_EVENT, sync);
    return () => window.removeEventListener(PROGRESS_EVENT, sync);
  }, []);

  const deck = useMemo(() => (all ?? []).filter((c) => !dom || c.d === dom), [all, dom]);

  const pick = useCallback((exclude?: string) => {
    const b = getCards();
    const pool = deck.filter((c) => c.k !== exclude);
    if (!pool.length) { setCur(deck[0] ?? null); return; }
    // Lowest Leitner box first; random among the ties (user-triggered, client-only).
    const min = Math.min(...pool.map((c) => b[c.k] ?? 0));
    const ties = pool.filter((c) => (b[c.k] ?? 0) === min);
    setCur(ties[Math.floor(Math.random() * ties.length)]);
    setShown(false);
  }, [deck]);

  useEffect(() => { if (deck.length) pick(); }, [deck, pick]);

  const grade = useCallback((knew: boolean) => { if (cur) { gradeCard(cur.k, knew); pick(cur.k); } }, [cur, pick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === " " || e.key === "Enter") { if (!shown) { e.preventDefault(); setShown(true); } }
      else if (e.key === "1" && shown) grade(false);
      else if (e.key === "2" && shown) grade(true);
      else if (e.key === "ArrowRight") pick(cur?.k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, grade, pick, cur]);

  const reviewed = deck.filter((c) => boxes[c.k] != null).length;
  const solid = deck.filter((c) => (boxes[c.k] ?? 0) >= 3).length;
  const d = cur ? domains.find((x) => x.id === cur.d) : undefined;

  return (
    <div className="flash">
      <div className="chips" role="group" aria-label={labels.deck}>
        <button type="button" className={`chip-btn${!dom ? " on" : ""}`} onClick={() => setDom("")}>{labels.all}</button>
        {domains.map((x) => (
          <button key={x.id} type="button" style={{ ["--h" as string]: x.hue }} className={`chip-btn${dom === x.id ? " on" : ""}`}
            onClick={() => setDom(dom === x.id ? "" : x.id)}>{x.title}</button>
        ))}
      </div>
      <div className="flash-stats">
        <span>{deck.length} {labels.questions}</span>
        <span>{reviewed} {labels.reviewed}</span>
        <div className="meter-bar"><span style={{ width: `${deck.length ? (100 * solid) / deck.length : 0}%` }} /></div>
        <button type="button" className="link-btn" onClick={() => { if (confirm(labels.reset + "?")) resetCards(); }}>{labels.reset}</button>
      </div>
      {!all && <div className="flash-card skeleton" />}
      {cur && (
        <div className="flash-card" style={{ ["--h" as string]: d?.hue ?? 250 }}>
          <div className="flash-meta">
            {d && <span className="chip">{d.title}</span>}
            <Link href={`/${locale}/c/${cur.id}/#interview`} className="flash-concept">{cur.t} <Icon name="right" size={14} /></Link>
          </div>
          <p className="flash-q">{cur.q}</p>
          {shown ? (
            <>
              <div className="flash-a" dangerouslySetInnerHTML={{ __html: inlineMd(cur.a) }} />
              <div className="flash-actions">
                <button type="button" className="btn btn-again" onClick={() => grade(false)}><kbd>1</kbd> {labels.again}</button>
                <button type="button" className="btn btn-good" onClick={() => grade(true)}><kbd>2</kbd> {labels.gotIt}</button>
              </div>
            </>
          ) : (
            <div className="flash-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShown(true)}><kbd>Space</kbd> {labels.reveal}</button>
              <button type="button" className="btn" onClick={() => pick(cur.k)}>{labels.skip} <kbd>→</kbd></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
