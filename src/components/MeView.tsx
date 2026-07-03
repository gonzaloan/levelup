"use client";
// Progress. Signal (competence feedback, not a quota), mastered modules,
// and Cadence — opt-in, forgiving, OFF by default (§A6).
import { useEffect, useState } from "react";
import Link from "next/link";
import { load, update, type Progress } from "@/lib/store";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { MODULES_BY_ID } from "@/content/registry";

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
