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

// Skeleton AI-track stars — visible flagship, not fabricated deep content.
const AI_SKELETON: ChartNode[] = [
  ai("ai-l5-evals", 0.30, 0.20, 3, "Evals as Engineering"),
  ai("ai-l5-rag", 0.45, 0.32, 2, "RAG Architecture"),
  ai("ai-l5-agents", 0.58, 0.22, 2, "Agent & Tool Design"),
  ai("ai-l5-inj", 0.40, 0.12, 2, "Prompt Injection & OWASP"),
  ai("ai-l5-gauntlet", 0.52, 0.44, 3, "The 30% Gauntlet"),
];
function ai(id: string, x: number, y: number, mag: 1 | 2 | 3, title: string): ChartNode {
  return { id, x, y, magnitude: mag, title, level: "L5", constellation: "ai", track: "ai", state: "locked", prerequisites: [] };
}

export function MapView({ locale, modules }: { locale: Locale; modules: Module[] }) {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => setProgress(load()), []);

  const p = progress;
  const genNodes: ChartNode[] = modules
    .filter((mod) => mod.track === "general")
    .map((mod) => {
      let state: NodeState = "available";
      if (p) {
        if (p.mastered.includes(mod.id)) state = "mastered";
        else if (!isUnlocked(mod.id, mod.prerequisites ?? [], p)) state = "locked";
      }
      // current = first available, non-mastered module in order
      return {
        id: mod.id,
        x: mod.chart.x, y: mod.chart.y, magnitude: mod.chart.magnitude,
        title: t(mod.title, locale), level: mod.level, constellation: mod.chart.constellation,
        track: "general" as const, state, prerequisites: mod.prerequisites ?? [],
      };
    });

  // mark the lowest-order available module as "current"
  const firstAvailable = modules
    .filter((mod) => mod.track === "general")
    .sort((a, b) => a.order - b.order)
    .find((mod) => {
      const n = genNodes.find((g) => g.id === mod.id);
      return n?.state === "available";
    });
  const nodes = [...genNodes, ...AI_SKELETON].map((n) =>
    firstAvailable && n.id === firstAvailable.id ? { ...n, state: "current" as NodeState } : n
  );

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
        <StarChart nodes={nodes} locale={locale} onSelect={(id) => {
          if (id.startsWith("ai-")) return; // skeleton
          router.push(`/${locale}/module/${id}`);
        }} />
      </div>
      <div style={{ display: "flex", gap: "var(--s-6)", flexWrap: "wrap" }}>
        <Legend swatch="var(--gen)" label={t({ en: "General Engineering", es: "Ingeniería General" }, locale)} />
        <Legend swatch="var(--ai)" label={t({ en: "AI Engineering (flagship)", es: "Ingeniería de IA (insignia)" }, locale)} />
        <Legend swatch="var(--locked)" label={t({ en: "Locked", es: "Bloqueado" }, locale)} outline />
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
