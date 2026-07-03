"use client";
// Progress. Signal (competence feedback, not a quota), mastered modules,
// and Cadence — opt-in, forgiving, OFF by default (§A6).
import { useEffect, useState } from "react";
import Link from "next/link";
import { load, update, type Progress } from "@/lib/store";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { MODULES_BY_ID } from "@/content/registry";
import { AXIS_BY_ID, BAND_RANGE } from "@/lib/axes";

export function MeView({ locale }: { locale: Locale }) {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => {
    setP(load());
    const on = () => setP(load());
    window.addEventListener("levelup:progress", on);
    return () => window.removeEventListener("levelup:progress", on);
  }, []);
  if (!p) return <p className="dim">…</p>;

  function toggleCadence() {
    setP(update((prev) => ({ ...prev, cadence: { ...prev.cadence, enabled: !prev.cadence.enabled } })));
  }

  return (
    <div className="stack" style={{ gap: "var(--s-8)" }}>
      <div>
        <p className="eyebrow">{m("nav.me", locale)}</p>
        <h1 className="display" style={{ fontSize: "var(--t-h1)" }}>{t({ en: "Your evidence so far", es: "Tu evidencia hasta ahora" }, locale)}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: "var(--s-4)" }}>
        <Stat label={m("signal.label", locale)} value={String(p.signal)} accent="var(--gen)" />
        <Stat label={t({ en: "Modules mastered", es: "Módulos dominados" }, locale)} value={String(p.mastered.length)} accent="var(--ai)" />
        <Stat label={t({ en: "Rooms cleared", es: "Salas superadas" }, locale)} value={String(p.roomsCleared.length)} accent="var(--ai-signal)" />
      </div>

      {/* Placement summary — band chips per axis, or a prompt to take it */}
      {p.assessment ? (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--s-4)", flexWrap: "wrap", gap: "var(--s-2)" }}>
            <p className="eyebrow">{t({ en: "Your placement", es: "Tu diagnóstico" }, locale)}</p>
            <Link href={`/${locale}/assess/results`} className="eyebrow" style={{ color: "var(--gen)" }}>
              {t({ en: "full result →", es: "resultado completo →" }, locale)}
            </Link>
          </div>
          <div style={{ display: "grid", gap: "var(--s-2)" }}>
            {p.assessment.axes.map((ar) => {
              const range = BAND_RANGE[ar.band];
              return (
                <div key={ar.axis} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--s-3)" }}>
                  <span style={{ fontSize: "var(--t-sm)" }}>{t(AXIS_BY_ID[ar.axis].name, locale)}</span>
                  <span className="mono" style={{ fontSize: "var(--t-xs)", color: "var(--gen-accent)" }}>
                    {t(range.label, locale)} · {range.levels[0]}–{range.levels[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--s-4)", flexWrap: "wrap" }}>
          <span className="dim" style={{ fontSize: "var(--t-sm)" }}>
            {t({ en: "You haven't been placed yet. Twenty minutes, no login, honest result.", es: "Todavía no tienes diagnóstico. Veinte minutos, sin cuenta, resultado honesto." }, locale)}
          </span>
          <Link href={`/${locale}/assess`} className="btn btn-primary">{m("landing.cta", locale)}</Link>
        </div>
      )}

      {p.mastered.length > 0 && (
        <div className="stack">
          <p className="eyebrow">{t({ en: "Mastered", es: "Dominados" }, locale)}</p>
          {p.mastered.map((id) => {
            const mod = MODULES_BY_ID.get(id);
            return mod ? (
              <Link key={id} href={`/${locale}/module/${id}`} className="card" style={{ padding: "var(--s-3) var(--s-4)", display: "block" }}>
                {t(mod.title, locale)}
              </Link>
            ) : null;
          })}
        </div>
      )}

      {/* Cadence — opt-in, forgiving, off by default */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--s-4)" }}>
          <div>
            <p style={{ fontFamily: "var(--font-head)", fontWeight: 600 }}>{m("cadence.label", locale)}</p>
            <p className="dim" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>{m("cadence.optin", locale)}</p>
          </div>
          <button className="btn" onClick={toggleCadence} aria-pressed={p.cadence.enabled}
            style={p.cadence.enabled ? { borderColor: "var(--gen)", background: "var(--surface-3)" } : {}}>
            {p.cadence.enabled ? t({ en: "On", es: "Activado" }, locale) : t({ en: "Off", es: "Apagado" }, locale)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card" style={{ padding: "var(--s-4)" }}>
      <div className="mono" style={{ fontSize: "2rem", color: accent, lineHeight: 1 }}>{value}</div>
      <div className="eyebrow" style={{ marginTop: "var(--s-2)" }}>{label}</div>
    </div>
  );
}
