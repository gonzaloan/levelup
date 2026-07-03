"use client";
// Module reader → retrieval (recall, not recognition) → the Room → Field Work.
// Mastery gate: ~90% on retrieval marks the module mastered and awards Signal.
import { useState } from "react";
import Link from "next/link";
import { masterModule } from "@/lib/store";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXIS_BY_ID } from "@/lib/axes";
import type { Module, Item, Sjt, FieldWork } from "@/lib/types";
import { RoomPlayer } from "./RoomPlayer";
import { FieldWorkView } from "./FieldWorkView";

type Stage = "read" | "retrieval" | "room" | "field";

export function ModuleView({
  locale, mod, retrievalItems, room, fieldWork,
}: {
  locale: Locale; mod: Module; retrievalItems: Item[]; room: Sjt | null; fieldWork: FieldWork | null;
}) {
  const [stage, setStage] = useState<Stage>("read");

  return (
    <div className="stack" style={{ gap: "var(--s-8)" }}>
      <div>
        <div style={{ display: "flex", gap: "var(--s-3)", alignItems: "center", marginBottom: "var(--s-3)" }}>
          <span className="level-tag">{mod.level}</span>
          <span className="eyebrow">{t(AXIS_BY_ID[mod.axis.primary].name, locale)}</span>
        </div>
        <h1 className="display" style={{ fontSize: "var(--t-h1)" }}>{t(mod.title, locale)}</h1>
        <p className="prose" style={{ fontSize: "1.125rem" }}>{t(mod.tagline, locale)}</p>
      </div>

      {/* progress rail */}
      <div style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
        {(["read", "retrieval", "room", "field"] as Stage[]).map((s) => {
          const labels: Record<Stage, { en: string; es: string }> = {
            read: { en: "Read", es: "Leer" },
            retrieval: { en: "Recall", es: "Recordar" },
            room: { en: "The Room", es: "La Sala" },
            field: { en: "Field Work", es: "Trabajo de Campo" },
          };
          const disabled = (s === "room" && !room) || (s === "field" && !fieldWork);
          return (
            <button key={s} className="btn" disabled={disabled}
              aria-pressed={stage === s}
              onClick={() => !disabled && setStage(s)}
              style={{ opacity: disabled ? 0.4 : 1, borderColor: stage === s ? "var(--gen)" : "var(--hairline)", fontSize: "var(--t-xs)" }}>
              {t(labels[s], locale)}
            </button>
          );
        })}
      </div>

      {stage === "read" && (
        <div className="stack" style={{ gap: "var(--s-6)" }}>
          {mod.topics.map((topic) => (
            <section key={topic.id} className="card">
              <h2 style={{ fontSize: "var(--t-h3)", marginBottom: "var(--s-4)" }}>{t(topic.title, locale)}</h2>
              {t(topic.body, locale).split("\n").filter(Boolean).map((para, i) => (
                <p key={i} style={{ marginBottom: "var(--s-3)" }}>{para}</p>
              ))}
            </section>
          ))}
          <div>
            <button className="btn btn-primary" onClick={() => setStage(retrievalItems.length ? "retrieval" : room ? "room" : "field")}>
              {m("cta.continue", locale)}
            </button>
          </div>
        </div>
      )}

      {stage === "retrieval" && (
        <Retrieval locale={locale} items={retrievalItems} moduleId={mod.id}
          onDone={() => setStage(room ? "room" : fieldWork ? "field" : "read")} />
      )}

      {stage === "room" && room && (
        <RoomPlayer locale={locale} room={room} onDone={() => setStage(fieldWork ? "field" : "read")} />
      )}

      {stage === "field" && fieldWork && (
        <FieldWorkView locale={locale} fieldWork={fieldWork} />
      )}

      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: "var(--s-4)" }}>
        <Link href={`/${locale}/map`} className="eyebrow">← {m("nav.map", locale)}</Link>
      </div>
    </div>
  );
}

// Retrieval: recall-first. Reveals the teaching rationale after each answer.
function Retrieval({ locale, items, moduleId, onDone }: { locale: Locale; items: Item[]; moduleId: string; onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  if (items.length === 0) {
    return (
      <div className="card">
        <p className="dim">{t({ en: "No recall items on this module yet.", es: "Aún no hay ítems de recuerdo en este módulo." }, locale)}</p>
        <button className="btn" style={{ marginTop: "var(--s-4)" }} onClick={onDone}>{m("cta.continue", locale)}</button>
      </div>
    );
  }

  const item = items[idx];
  const chosen = item.options.find((o) => o.id === picked);

  function next() {
    const wasCorrect = !!chosen?.correct;
    const newCount = correctCount + (wasCorrect ? 1 : 0);
    if (idx + 1 < items.length) {
      setCorrectCount(newCount);
      setIdx(idx + 1);
      setPicked(null);
    } else {
      const ratio = newCount / items.length;
      masterModule(moduleId, ratio);
      onDone();
    }
  }

  return (
    <div className="stack">
      <span className="eyebrow">{t({ en: "Recall", es: "Recordar" }, locale)} · {idx + 1}/{items.length}</span>
      <div className="card">
        <p style={{ color: "var(--text)", marginBottom: "var(--s-5)" }}>{t(item.stem, locale)}</p>
        <div className="stack">
          {item.options.map((o) => {
            const revealed = picked !== null;
            const isChosen = picked === o.id;
            const border = revealed ? (o.correct ? "var(--ok)" : isChosen ? "var(--bad)" : "var(--hairline)") : (isChosen ? "var(--gen)" : "var(--hairline)");
            return (
              <button key={o.id} className="btn" disabled={revealed} onClick={() => setPicked(o.id)}
                style={{ textAlign: "left", justifyContent: "flex-start", borderColor: border, background: "var(--surface-2)" }}>
                {t(o.text, locale)}
              </button>
            );
          })}
        </div>
        {chosen && (
          <div style={{ marginTop: "var(--s-4)", padding: "var(--s-4)", background: chosen.correct ? "var(--ok-bg)" : "var(--bad-bg)", borderRadius: "var(--r-sm)" }}>
            <p style={{ fontSize: "var(--t-sm)", color: "var(--text)" }}>{t(chosen.rationale, locale)}</p>
          </div>
        )}
        {picked && (
          <div style={{ marginTop: "var(--s-4)" }}>
            <button className="btn btn-primary" onClick={next}>{m("assess.next", locale)}</button>
          </div>
        )}
      </div>
    </div>
  );
}
