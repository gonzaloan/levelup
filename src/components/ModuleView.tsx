"use client";
// Module reader → recognition check → the Room → Field Work.
// Mastery gate: ~90% on the check marks the module mastered and awards Signal.
import { useEffect, useState } from "react";
import Link from "next/link";
import { load, masterModule } from "@/lib/store";
import { fireReward } from "./Reward";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXIS_BY_ID } from "@/lib/axes";
import { cbmScore } from "@/lib/scoring";
import type { Module, Item, Sjt, FieldWork, Response, Confidence } from "@/lib/types";
import { RoomPlayer } from "./RoomPlayer";
import { FieldWorkView } from "./FieldWorkView";
import { Diagram } from "./Diagram";

type Stage = "read" | "retrieval" | "room" | "field";

export function ModuleView({
  locale, mod, retrievalItems, room, fieldWork,
}: {
  locale: Locale; mod: Module; retrievalItems: Item[]; room: Sjt | null; fieldWork: FieldWork | null;
}) {
  const [stage, setStage] = useState<Stage>("read");
  const [mastered, setMastered] = useState(false);
  useEffect(() => {
    setMastered(load().mastered.includes(mod.id));
    const on = () => setMastered(load().mastered.includes(mod.id));
    window.addEventListener("levelup:progress", on);
    return () => window.removeEventListener("levelup:progress", on);
  }, [mod.id]);

  return (
    <div className="stack" style={{ gap: "var(--s-8)" }}>
      <div>
        <div style={{ display: "flex", gap: "var(--s-3)", alignItems: "center", marginBottom: "var(--s-3)" }}>
          <span className="level-tag">{mod.level}</span>
          <span className="eyebrow">{t(AXIS_BY_ID[mod.axis.primary].name, locale)}</span>
          {mastered && (
            <span className="eyebrow" style={{ color: "var(--ok)" }} title="mastered">
              ✦ {t({ en: "mastered", es: "dominado" }, locale)}
            </span>
          )}
        </div>
        <h1 className="display" style={{ fontSize: "var(--t-h1)" }}>{t(mod.title, locale)}</h1>
        <p className="prose" style={{ fontSize: "1.125rem" }}>{t(mod.tagline, locale)}</p>
      </div>

      {/* progress rail */}
      <div style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
        {(["read", "retrieval", "room", "field"] as Stage[]).map((s) => {
          const labels: Record<Stage, { en: string; es: string }> = {
            read: { en: "Read", es: "Leer" },
            retrieval: { en: "Check", es: "Comprobar" },
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
              {topic.diagram && <Diagram id={topic.diagram} locale={locale} />}
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
        <Retrieval locale={locale} items={retrievalItems} mod={mod}
          onDone={() => setStage(room ? "room" : fieldWork ? "field" : "read")} />
      )}

      {stage === "room" && room && (
        <RoomPlayer locale={locale} room={room} onDone={() => setStage(fieldWork ? "field" : "read")} />
      )}

      {stage === "field" && fieldWork && (
        <FieldWorkView locale={locale} fieldWork={fieldWork} />
      )}

      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: "var(--s-4)" }}>
        {/* Carry ?ignited= so a freshly-mastered node blooms when they reach the chart. */}
        <Link href={`/${locale}/map${mastered ? `?ignited=${mod.id}` : ""}`} className="eyebrow">← {m("nav.map", locale)}</Link>
      </div>
    </div>
  );
}

// Retrieval: recall-first, CBM-gated. You pick an answer AND say how sure you
// are; the module's signature Certainty-Based Marking rule then scores it, so a
// confident-wrong answer costs you and mastery must be earned with calibration —
// not by clicking through with the answers revealed (the old gameable gate).
function Retrieval({ locale, items, mod, onDone }: { locale: Locale; items: Item[]; mod: Module; onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);

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
  const revealed = picked !== null && confidence !== null;

  function next() {
    if (!chosen || !confidence) return;
    const resp: Response = {
      itemId: item.id, optionId: chosen.id, correct: !!chosen.correct,
      confidence, axis: item.axis, difficulty: item.difficulty, ts: 0,
    };
    const all = [...responses, resp];
    if (idx + 1 < items.length) {
      setResponses(all);
      setIdx(idx + 1);
      setPicked(null);
      setConfidence(null);
    } else {
      // Mastery gate decoupled (review fix #9): you must get the content right
      // (correctness >= 0.8) AND not be badly mis-calibrated (CBM not in the
      // penalty floor). This stops the old gate from punishing an honest
      // "correct but unsure" learner, while a confident-wrong still blocks.
      const correctRatio = all.filter((r) => r.correct).length / all.length;
      const cbm = cbmScore(all);
      const passed = correctRatio >= 0.8 && cbm >= 0.6;
      // Pass 1.0 when the learner earned mastery, else the correctness ratio so
      // moduleScores still records real progress. threshold 1.0 ⇒ gate honored here.
      const outcome = masterModule(mod.id, passed ? 1 : correctRatio, 1);
      if (outcome.newlyMastered) {
        // Star ignition: fire the threshold-crossing readout. The reward is
        // competence-informational and MODULE-LOCAL — it does not claim a level
        // (mastery always clears 0.8 CBM, so any "band" here would be constant
        // and misleading). The learner then continues the loop (Room / Field
        // Work); the Star-Chart payoff waits on the map, where this node blooms
        // via ?ignited= whenever they next visit.
        const axis = AXIS_BY_ID[mod.axis.primary];
        fireReward({
          kind: "mastery",
          track: mod.track,
          signal: outcome.signalDelta,
          title: `${t(axis.short, locale).toUpperCase()} · ${t({ en: "STAR CHARTED", es: "ESTRELLA TRAZADA" }, locale)}`,
          body: t(
            {
              en: `You mastered ${t(mod.title, "en")}. Charted on your ${axis.name.en} constellation — clear the Room next to prove the judgment holds under pressure.`,
              es: `Dominaste ${t(mod.title, "es")}. Trazado en tu constelación de ${axis.name.es} — supera la Sala para probar que el criterio aguanta bajo presión.`,
            },
            locale
          ),
        });
      }
      onDone();
    }
  }

  return (
    <div className="stack">
      <span className="eyebrow">{t({ en: "Check", es: "Comprobar" }, locale)} · {idx + 1}/{items.length}</span>
      <div className="card">
        <p style={{ color: "var(--text)", marginBottom: "var(--s-5)" }}>{t(item.stem, locale)}</p>
        <div className="stack">
          {item.options.map((o) => {
            const isChosen = picked === o.id;
            const border = revealed ? (o.correct ? "var(--ok)" : isChosen ? "var(--bad)" : "var(--hairline)") : (isChosen ? "var(--gen)" : "var(--hairline)");
            return (
              <button key={o.id} className="btn" disabled={revealed} onClick={() => !revealed && setPicked(o.id)}
                style={{ textAlign: "left", justifyContent: "flex-start", borderColor: border, background: "var(--surface-2)" }}>
                {t(o.text, locale)}
              </button>
            );
          })}
        </div>

        {/* Confidence capture — must commit certainty before the key is revealed. */}
        {picked && !revealed && (
          <div style={{ marginTop: "var(--s-4)" }}>
            <div className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>{m("assess.confidence.prompt", locale)}</div>
            <div style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
              {([["low", "assess.confidence.low"], ["mid", "assess.confidence.mid"], ["high", "assess.confidence.high"]] as const).map(([c, key]) => (
                <button key={c} className="btn" aria-pressed={confidence === c} onClick={() => setConfidence(c)}
                  style={confidence === c ? { borderColor: "var(--ai-signal)", background: "var(--surface-3)" } : {}}>
                  {m(key, locale)}
                </button>
              ))}
            </div>
          </div>
        )}

        {revealed && chosen && (
          <div style={{ marginTop: "var(--s-4)", padding: "var(--s-4)", background: chosen.correct ? "var(--ok-bg)" : "var(--bad-bg)", borderRadius: "var(--r-sm)" }}>
            <p style={{ fontSize: "var(--t-sm)", color: "var(--text)" }}>{t(chosen.rationale, locale)}</p>
          </div>
        )}
        {revealed && (
          <div style={{ marginTop: "var(--s-4)" }}>
            <button className="btn btn-primary" onClick={next}>{m("assess.next", locale)}</button>
          </div>
        )}
      </div>
    </div>
  );
}
