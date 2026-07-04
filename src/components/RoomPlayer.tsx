"use client";
// The Room — a situational-judgment scenario. Multiple DEFENSIBLE responses,
// scored against a senior-reviewed key (not one-right-answer). You commit to a
// choice AND write your rationale first (reduces faking); then you see the
// tradeoff verdicts. Harmful picks can branch to a downstream scenario.
import { useState } from "react";
import { update, awardSignal } from "@/lib/store";
import { fireReward } from "./Reward";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import type { Sjt } from "@/lib/types";

export function RoomPlayer({ locale, room, onDone }: { locale: Locale; room: Sjt; onDone: () => void }) {
  const [rationale, setRationale] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const chosen = room.responses.find((r) => r.id === picked);
  const best = room.responses.reduce((a, b) => (b.score > a.score ? b : a), room.responses[0]);

  function commit() {
    if (!picked || rationale.trim().length < 8) return;
    setRevealed(true);
    const optimal = !!chosen && chosen.score >= best.score;
    if (optimal) awardSignal(15);
    update((p) => ({ ...p, roomsCleared: p.roomsCleared.includes(room.id) ? p.roomsCleared : [...p.roomsCleared, room.id] }));
    fireReward({
      kind: "room",
      track: room.track,
      signal: optimal ? 15 : 0,
      title: t({ en: "THE ROOM · CLEARED", es: "LA SALA · SUPERADA" }, locale),
      body: optimal
        ? t({ en: "You made the call a senior reviewer would defend. That judgment is the level.", es: "Tomaste la decisión que un revisor senior defendería. Ese criterio es el nivel." }, locale)
        : t({ en: "Committed and reasoned — now read the key. The gap between your call and the best one is where the level is.", es: "Te comprometiste y razonaste — ahora lee la clave. La brecha entre tu decisión y la mejor es donde está el nivel." }, locale),
    });
  }

  return (
    <div className="stack">
      <div>
        <p className="eyebrow" style={{ color: "var(--ai-signal)" }}>{t({ en: "The Room", es: "La Sala" }, locale)}</p>
        <p className="dim" style={{ fontSize: "var(--t-xs)" }}>
          {t({ en: `Senior-reviewed key · ${room.reviewers} reviewer${room.reviewers === 1 ? "" : "s"} · defensible answers, not one right answer`,
               es: `Clave revisada por seniors · ${room.reviewers} revisor${room.reviewers === 1 ? "" : "es"} · respuestas defendibles, no una sola correcta` }, locale)}
        </p>
      </div>

      <div className="card" style={{ borderLeft: "2px solid var(--ai-signal)" }}>
        <p style={{ color: "var(--text)", fontSize: "1.0625rem" }}>{t(room.scenario, locale)}</p>
      </div>

      <div className="stack">
        {room.responses.map((r) => {
          const border = revealed
            ? (r.verdict === "best" ? "var(--ok)" : r.verdict === "harmful" ? "var(--bad)" : "var(--hairline-2)")
            : (picked === r.id ? "var(--ai-signal)" : "var(--hairline)");
          return (
            <button key={r.id} className="btn" disabled={revealed} onClick={() => setPicked(r.id)}
              style={{ textAlign: "left", justifyContent: "flex-start", borderColor: border, background: "var(--surface-2)", padding: "var(--s-3) var(--s-4)" }}>
              {t(r.text, locale)}
            </button>
          );
        })}
      </div>

      {!revealed && (
        <div className="card" style={{ padding: "var(--s-4)" }}>
          <label className="eyebrow" htmlFor="rat" style={{ display: "block", marginBottom: "var(--s-2)" }}>
            {t({ en: "Before you see the key: why?", es: "Antes de ver la clave: ¿por qué?" }, locale)}
          </label>
          <textarea id="rat" value={rationale} onChange={(e) => setRationale(e.target.value)}
            rows={3} placeholder={t({ en: "One or two sentences on your reasoning…", es: "Una o dos frases sobre tu razonamiento…" }, locale)}
            style={{ width: "100%", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--hairline-2)", borderRadius: "var(--r-sm)", padding: "var(--s-3)", fontFamily: "var(--font-body)", resize: "vertical" }} />
          <div style={{ marginTop: "var(--s-3)" }}>
            <button className="btn btn-primary" disabled={!picked || rationale.trim().length < 8} onClick={commit}
              style={!picked || rationale.trim().length < 8 ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
              {t({ en: "Commit", es: "Comprometerse" }, locale)}
            </button>
          </div>
        </div>
      )}

      {revealed && (
        <div className="stack">
          {room.responses.map((r) => (
            <div key={r.id} className="card" style={{ padding: "var(--s-4)", opacity: r.id === picked ? 1 : 0.65 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--s-2)" }}>
                <span className="eyebrow" style={{ color: r.verdict === "best" ? "var(--ok)" : r.verdict === "harmful" ? "var(--bad)" : "var(--text-3)" }}>{r.verdict}</span>
                {r.id === picked && <span className="eyebrow">{t({ en: "your call", es: "tu elección" }, locale)}</span>}
              </div>
              <p style={{ fontSize: "var(--t-sm)" }}>{t(r.rationale, locale)}</p>
            </div>
          ))}
          <div><button className="btn btn-primary" onClick={onDone}>{m("cta.continue", locale)}</button></div>
        </div>
      )}
    </div>
  );
}
