"use client";
import { useMemo, useRef } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { m, type UIKey } from "@/lib/i18n";
import { dayKey, emptyState, levelOf, merge, saveState, streakOf, totalXp, type StudyState } from "@/lib/practice/store";
import { buildSession, conceptStatus, dueItems, indexByConcept, nextConcept, type ConceptStatus } from "@/lib/practice/session";
import { usePracticeData, useStudyState } from "./usePractice";
import { Icon } from "../Icon";

export function Hub({ locale }: { locale: Locale }) {
  const L = (k: string) => m(k as UIKey, locale);
  const data = usePracticeData(locale);
  const [state, update] = useStudyState();
  const now = useMemo(() => new Date(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const view = useMemo(() => {
    if (!data || !state) return null;
    const byC = indexByConcept(data);
    const status = new Map<string, ConceptStatus>();
    for (const c of Object.keys(data.meta)) status.set(c, conceptStatus(data, state, c, byC));
    const due = dueItems(data, state, now).length;
    const daily = buildSession(data, state, { mode: "daily" }, now);
    const newCount = daily.filter((i) => !state.cards[i.id]).length;
    const weak = buildSession(data, state, { mode: "weak" }, now).length;
    return { status, due, daily: daily.length, newCount, weak, next: nextConcept(data, state) };
  }, [data, state, now]);

  if (!data || !state || !view) return <div className="p-card skeleton">{L("pLoading")}</div>;

  const xp = totalXp(state);
  const lvl = levelOf(xp);
  const streak = streakOf(state, now);
  const today = state.days[dayKey(now)]?.xp ?? 0;
  const goalPct = Math.min(1, today / state.goal);
  const play = (q: string) => `/${locale}/practice/play/?${q}`;
  const nextMeta = view.next ? data.meta[view.next] : null;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `levelup-progress-${dayKey(now)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importData = (f: File) => f.text().then((t) => {
    try { const incoming = JSON.parse(t) as StudyState; if (incoming?.v === 1) update((s) => Object.assign(s, merge(s, incoming))); } catch { /* ignore bad file */ }
  });

  return (
    <div className="hub">
      <section className="hub-stats">
        <div className="hub-stat level">
          <span className="hub-label">{L("pLevel")} {lvl.index + 1}</span>
          <strong>{locale === "es" ? lvl.es : lvl.en}</strong>
          <div className="meter-bar"><span style={{ width: `${Math.round(lvl.progress * 100)}%` }} /></div>
          <span className="hub-sub">{xp.toLocaleString()} XP{lvl.next ? ` · ${(lvl.next.xp - xp).toLocaleString()} → ${locale === "es" ? lvl.next.es : lvl.next.en}` : ""}</span>
        </div>
        <div className="hub-stat streak" title={L("pFreeze")}>
          <span className="hub-label">🔥 {L("pStreak")}</span>
          <strong>{streak.days}</strong>
          <span className="hub-sub">{L("pFreeze")}</span>
        </div>
        <div className="hub-stat goal">
          <svg viewBox="0 0 36 36" className="ring" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" className="ring-bg" />
            <circle cx="18" cy="18" r="15.5" className="ring-fg" strokeDasharray={`${goalPct * 97.4} 97.4`} />
          </svg>
          <div>
            <span className="hub-label">{L("pGoal")}</span>
            <strong>{today}/{state.goal} XP</strong>
            <span className="hub-sub goal-pick">
              {[30, 60, 100].map((g) => (
                <button key={g} type="button" className={`link-btn${state.goal === g ? " on" : ""}`} onClick={() => update((s) => { s.goal = g; })}>{g}</button>
              ))}
            </span>
          </div>
        </div>
      </section>

      <section className="hub-today">
        <div>
          <h2>{L("pToday")}</h2>
          <p>{view.daily ? <><strong>{view.due}</strong> {L("pDue")} · <strong>{view.newCount}</strong> {L("pNew")}</> : L("pAllDone")}</p>
        </div>
        <a className="btn btn-primary big" href={play("mode=daily")}>{L("pStart")} <Icon name="right" size={18} /></a>
      </section>

      {view.next && nextMeta && (
        <section className="hub-next">
          <span className="hub-label">{L("pContinue")}</span>
          <strong>{nextMeta.t}</strong>
          <div className="hub-next-actions">
            <Link className="btn" href={`/${locale}/c/${view.next}/`}><Icon name="book" size={16} /> {L("pRead")}</Link>
            <a className="btn" href={play(`mode=concept&id=${view.next}`)}><Icon name="cards" size={16} /> {L("pPracticeIt")}</a>
          </div>
        </section>
      )}

      <section>
        <h2 className="section-label">{L("pModes")}</h2>
        <div className="mode-grid">
          <a className="mode-card" href={play("mode=mock")}><Icon name="mic" size={22} /><strong>{L("pMock")}</strong><span>{L("pMockSub")}</span></a>
          <a className="mode-card" href={play("mode=weak")}><Icon name="zap" size={22} /><strong>{L("pWeak")} {view.weak ? `(${view.weak})` : ""}</strong><span>{L("pWeakSub")}</span></a>
          <a className="mode-card" href={play("mode=cards")}><Icon name="cards" size={22} /><strong>{L("pCards")}</strong><span>{L("pCardsSub")}</span></a>
        </div>
      </section>

      <section>
        <h2 className="section-label">{L("pActivity")}</h2>
        <Heatmap state={state} now={now} />
      </section>

      <section>
        <h2 className="section-label">{L("pProgress")}</h2>
        {data.phases.map((p) => (
          <div key={p.id} className="hub-phase">
            <h3>{p.t}</h3>
            {p.modules.map((mod) => {
              const counts = { mastered: 0, review: 0, learning: 0, new: 0 };
              mod.c.forEach((c) => counts[view.status.get(c) ?? "new"]++);
              const n = mod.c.length || 1;
              return (
                <a key={mod.id} className="hub-module" href={play(`mode=module&id=${mod.id}`)}>
                  <span className="hm-title">{mod.t}</span>
                  <span className="hm-bar" aria-hidden="true">
                    <span className="s-mastered" style={{ width: `${(100 * counts.mastered) / n}%` }} />
                    <span className="s-review" style={{ width: `${(100 * counts.review) / n}%` }} />
                    <span className="s-learning" style={{ width: `${(100 * counts.learning) / n}%` }} />
                  </span>
                  <span className="hm-count">{counts.mastered + counts.review}/{mod.c.length}</span>
                </a>
              );
            })}
          </div>
        ))}
        <p className="legend">
          <span className="lg s-mastered" /> {L("pMastered")} · <span className="lg s-review" /> {L("pInReview")} · <span className="lg s-learning" /> {L("pLearning")}
        </p>
      </section>

      <section className="hub-backup">
        <button type="button" className="btn" onClick={exportData}><Icon name="external" size={15} /> {L("pExport")}</button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>{L("pImport")}</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
        <button type="button" className="link-btn" onClick={() => { if (confirm(L("pReset") + "?")) { saveState(emptyState()); location.reload(); } }}>{L("pReset")}</button>
      </section>
    </div>
  );
}

/** GitHub-style activity grid for the last 18 weeks. */
function Heatmap({ state, now }: { state: StudyState; now: Date }) {
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
