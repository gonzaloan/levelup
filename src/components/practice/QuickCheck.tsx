"use client";
// "Check yourself" on a concept page: the concept's own exercises, one at a time, graded in the
// browser with the same deterministic graders as practice mode. It does not touch the spaced-
// repetition schedule (no confidence is asked here); it marks the concept as read (today's learn
// task) and sends you back to the rest of today's mission.
import { useState } from "react";
import type { Locale } from "@/lib/types";
import type { PItem, Response } from "@/lib/practice/types";
import { grade } from "@/lib/practice/grade";
import { inlineMd } from "@/lib/practice/md";
import { learn, LEARN_XP, loadState, saveState } from "@/lib/practice/store";
import { m, type UIKey } from "@/lib/i18n";
import { ChoiceView, MatchView, MultiView, NumericView, OrderView, type ViewProps } from "./ItemViews";

const VIEWS: Record<string, (p: ViewProps) => React.ReactNode> = {
  multi: MultiView, order: OrderView, match: MatchView, numeric: NumericView,
};

/** Marks the concept learned; true when this is the first time (it paid LEARN_XP). */
function markRead(id: string): boolean {
  const s = loadState();
  const first = learn(s, id, new Date());
  if (first) saveState(s);
  return first;
}

export function QuickCheck({ items, conceptId, locale }: { items: PItem[]; conceptId: string; locale: Locale }) {
  const L = (k: string) => m(k as UIKey, locale);
  const [idx, setIdx] = useState(0);
  const [round, setRound] = useState(0);
  const [response, setResponse] = useState<Response | null>(null);
  const [result, setResult] = useState<{ score: number; correct: boolean } | null>(null);
  const [right, setRight] = useState(0);
  const [earned, setEarned] = useState(false);
  if (!items.length) return null;

  const finished = idx >= items.length;
  const item = items[Math.min(idx, items.length - 1)];
  const check = () => {
    if (!response) return;
    const r = grade(item, response);
    setResult(r);
    if (r.correct) setRight((n) => n + 1);
    if (markRead(conceptId)) setEarned(true);
  };
  const next = () => { setIdx((i) => i + 1); setResponse(null); setResult(null); };
  const again = () => { setIdx(0); setRound((r) => r + 1); setRight(0); setResponse(null); setResult(null); };

  if (finished) return (
    <div className="qc qc-done">
      <p className="qc-score"><strong>{right}/{items.length}</strong> {L("checkScore")}</p>
      <p>{earned && <strong className="qc-xp">+{LEARN_XP} XP · </strong>}{L("checkDone")}</p>
      <div className="qc-actions">
        {/* A full load, so Hoy opens at the top with its new count (the reward moment). */}
        <a className="btn btn-primary" href={`/${locale}/`}>{locale === "es" ? "Seguir con tu día" : "Continue your day"} →</a>
        <button type="button" className="link-btn" onClick={again}>{L("checkAgain")}</button>
      </div>
    </div>
  );

  const View = VIEWS[item.type] ?? ChoiceView;
  const props: ViewProps = { item, seed: `${item.id}:${round}`, done: !!result, response, setResponse, label: L };
  return (
    <div className={`qc${result ? (result.correct ? " is-ok" : result.score > 0 ? " is-partial" : " is-bad") : ""}`}>
      <div className="qc-top">
        <span className="qc-dots" role="img" aria-label={`${idx + 1} / ${items.length}`}>
          {items.map((_, i) => <i key={i} className={i < idx ? "past" : i === idx ? "now" : ""} />)}
        </span>
      </div>
      <div className="p-prompt" dangerouslySetInnerHTML={{ __html: inlineMd(item.prompt) }} />
      <View key={`${item.id}:${round}`} {...props} />
      {result && (
        <div className="p-feedback" role="status">
          <strong className="p-verdict">{result.correct ? `✓ ${L("pCorrect")}` : result.score > 0 ? `◐ ${L("pPartial")}` : `✗ ${L("pIncorrect")}`}</strong>
          {item.explain && <div className="p-explain" dangerouslySetInnerHTML={{ __html: inlineMd(item.explain) }} />}
        </div>
      )}
      <div className="qc-actions">
        {result
          ? <button type="button" className="btn btn-primary" onClick={next}>{idx + 1 < items.length ? L("pNext") : L("pFinish")}</button>
          : <button type="button" className="btn btn-primary" disabled={!response} onClick={check}>{L("pCheck")}</button>}
      </div>
    </div>
  );
}
