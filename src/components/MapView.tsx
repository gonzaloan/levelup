"use client";
// The Star Chart page. Renders the General L5 modules as authored stars, plus a
// clearly-labeled flagship AI-track cluster (skeleton — the map shows both
// tracks; deep AI content is a later phase, but the 30% Gauntlet is real).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StarChart, type ChartNode, type NodeState } from "./StarChart";
import { load, isUnlocked, type Progress } from "@/lib/store";
import { t, type Locale } from "@/i18n/config";
import type { Module } from "@/lib/types";

// The Gauntlet is LIVE now (playable boss). It gets its own bright, available
// clay star even before the deep AI modules land — it's the flagship's proof.
const GAUNTLET_NODE: ChartNode = {
  id: "gauntlet", x: 0.52, y: 0.44, magnitude: 3, title: "The 30% Gauntlet",
  level: "L5", constellation: "ai", track: "ai", state: "available", prerequisites: [],
};

export function MapView({ locale, modules }: { locale: Locale; modules: Module[] }) {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [ignitedId, setIgnitedId] = useState<string | null>(null);
  useEffect(() => {
    setProgress(load());
    // Read ?ignited= from the URL (client-only, no Suspense needed for static
    // export) so a freshly-mastered node blooms on arrival, then clear it so a
    // refresh doesn't replay the bloom.
    const params = new URLSearchParams(window.location.search);
    const ig = params.get("ignited");
    if (ig) {
      setIgnitedId(ig);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const p = progress;
  const moduleNodes: ChartNode[] = modules.map((mod) => {
    let state: NodeState = "available";
    if (p) {
      if (p.mastered.includes(mod.id)) state = "mastered";
      else if (!isUnlocked(mod.id, mod.prerequisites ?? [], p)) state = "locked";
    }
    return {
      id: mod.id,
      x: mod.chart.x, y: mod.chart.y, magnitude: mod.chart.magnitude,
      title: t(mod.title, locale), level: mod.level, constellation: mod.chart.constellation,
      track: mod.track, state, prerequisites: mod.prerequisites ?? [],
    };
  });

  // If the deep AI modules haven't been authored yet, keep the gauntlet as the
  // visible, playable flagship star; once ai modules exist they render normally.
  const hasAiModules = modules.some((mod) => mod.track === "ai");
  const extraNodes = hasAiModules ? [] : [GAUNTLET_NODE];

  // mark the lowest-order available module (per track) as "current"
  const firstAvailable = [...modules]
    .sort((a, b) => a.order - b.order)
    .find((mod) => moduleNodes.find((g) => g.id === mod.id)?.state === "available");
  const nodes = [...moduleNodes, ...extraNodes].map((n) =>
    firstAvailable && n.id === firstAvailable.id ? { ...n, state: "current" as NodeState } : n
  );

  // Learner altitude: a horizon that rises with within-band progress. All
  // current modules are L5, so we climb from L5 toward L6 by the fraction of
  // modules mastered — a marker that actually moves as you progress.
  const masteredCount = modules.filter((mod) => p?.mastered.includes(mod.id)).length;
  const climb = masteredCount > 0
    ? { level: "L5", fraction: masteredCount / Math.max(1, modules.length) }
    : null;

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <div>
        <p className="eyebrow">{t({ en: "The Star Chart", es: "La Carta Estelar" }, locale)}</p>
        <h1 className="display" style={{ fontSize: "var(--t-h1)", marginTop: "var(--s-2)" }}>
          {t({ en: "The whole climb, one chart.", es: "Toda la subida, una carta." }, locale)}
        </h1>
        <p className="prose">
          {t({ en: "Bright stars are earned; dim ones are ahead. The terracotta cluster to the north is the flagship AI-Engineering track — its 30% Gauntlet is live now, and the rest opens as the track lands.", es: "Las estrellas brillantes se ganan; las tenues están por delante. El cúmulo terracota al norte es la ruta insignia de Ingeniería de IA — su Desafío del 30% ya está activo, y el resto se abre cuando llegue la ruta." }, locale)}
        </p>
      </div>
      <div className="card" style={{ padding: "var(--s-4)" }}>
        <StarChart nodes={nodes} locale={locale} climb={climb} ignitedId={ignitedId} onSelect={(id) => {
          if (id === "gauntlet") { router.push(`/${locale}/gauntlet`); return; }
          router.push(`/${locale}/module/${id}`);
        }} />
      </div>
      <div style={{ display: "flex", gap: "var(--s-6)", flexWrap: "wrap", alignItems: "center" }}>
        <Legend swatch="var(--gen)" label={t({ en: "General Engineering", es: "Ingeniería General" }, locale)} />
        <Legend swatch="var(--ai)" label={t({ en: "AI Engineering (flagship)", es: "Ingeniería de IA (insignia)" }, locale)} />
        <Legend swatch="var(--locked)" label={t({ en: "Locked", es: "Bloqueado" }, locale)} outline />
        <button className="btn btn-ai btn-primary" style={{ marginLeft: "auto", fontSize: "var(--t-sm)" }}
          onClick={() => router.push(`/${locale}/gauntlet`)}>
          {t({ en: "Enter the 30% Gauntlet", es: "Entrar al Desafío del 30%" }, locale)} →
        </button>
      </div>
    </div>
  );
}

function Legend({ swatch, label, outline }: { swatch: string; label: string; outline?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)", color: "var(--text-2)" }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: outline ? "transparent" : swatch, border: outline ? `1px solid ${swatch}` : "none" }} />
      {label}
    </span>
  );
}
