"use client";
// The Learn hub — a faithful port of get-certified's Study view.
// Left: a Domains sidebar (6 domains, progress ring, always-visible L3→L7 ladder
// legend). Main: numbered domain cards; expanding one reveals its concepts as
// rows grouped under level sub-band headers, each row carrying its color-coded
// level chip (the category-tag slot) and a mark-reviewed checkbox; each level
// band ends in a Final Boss row (the checkpoint). A prominent General / AI track
// toggle sits on top. Everything opens the concept lesson or the boss in place.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { AXIS_BY_ID, LEVELS, LEVEL_LABEL, type Level } from "@/lib/axes";
import { ORDERED_DOMAINS, checkpointsAfter } from "@/lib/curriculum";
import type { CurriculumDomain } from "@/lib/types";
import { load, markConceptRead, type Progress } from "@/lib/store";
import { PixelOverworld } from "./PixelOverworld";

const AXIS_GRAD: Record<number, string> = {
  1: "linear-gradient(135deg,#0a3b6e,#1d6fd6,#4c9fff)",
  2: "linear-gradient(135deg,#0a237a,#1565c0,#42a5f5)",
  3: "linear-gradient(135deg,#054b52,#0f8f8f,#2fd0c8)",
  4: "linear-gradient(135deg,#6e5406,#b8860b,#e8b53a)",
  5: "linear-gradient(135deg,#1f5c2e,#2f8f3f,#6daa2c)",
  6: "linear-gradient(135deg,#6e2f1c,#b3583b,#d97757)",
};
const LEVEL_WHAT: Record<Level, { en: string; es: string }> = {
  L3: { en: "Build the foundations — reason about cost and correctness on one machine.", es: "Construye las bases — razona sobre costo y corrección en una máquina." },
  L4: { en: "Own your area — make the design calls and ship reliably.", es: "Sé dueño de tu área — toma las decisiones de diseño y entrega con fiabilidad." },
  L5: { en: "Cross the Staff threshold — set the technical approach across a team.", es: "Cruza el umbral Staff — fija el enfoque técnico de un equipo." },
  L6: { en: "Staff — set multi-team, multi-quarter direction.", es: "Staff — fija dirección multi-equipo y multi-trimestre." },
  L7: { en: "Principal — shape org-wide technical strategy.", es: "Principal — moldea la estrategia técnica de toda la organización." },
};

type Track = "general" | "ai";

export function LearnHub({ locale }: { locale: Locale }) {
  const [pixel, setPixel] = useState(false);
  useEffect(() => {
    const check = () => setPixel(document.documentElement.getAttribute("data-theme") === "pixel");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    setProgress(load());
    const on = () => setProgress(load());
    window.addEventListener("levelup:progress", on);
    return () => window.removeEventListener("levelup:progress", on);
  }, []);

  const [track, setTrack] = useState<Track>("general");

  const domains = useMemo(
    () => ORDERED_DOMAINS.filter((d) => (track === "ai" ? d.id === "ai-engineering" : d.id !== "ai-engineering")),
    [track]
  );

  // Auto-expand the first domain so the step-by-step concept list is visible
  // immediately (reviewer note: don't hide the value behind a click).
  const [openId, setOpenId] = useState<string>("");
  useEffect(() => { setOpenId(domains[0]?.id ?? ""); }, [domains]);

  if (pixel) return <PixelOverworld locale={locale} />;

  return (
    <div className="wrap" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)" }}>
      <div className="ws-head">
        <h1 className="ws-title"><span className="code">{t({ en: "Learn", es: "Aprender" }, locale)}</span>{t({ en: "Climb the ladder, one concept at a time.", es: "Sube la escalera, un concepto a la vez." }, locale)}</h1>
      </div>

      {/* Track toggle — the old "Tracks" menu, now a clear switch */}
      <div className="gc-trackseg" role="tablist" aria-label={t({ en: "Track", es: "Ruta" }, locale)}>
        <button role="tab" aria-selected={track === "general"} className={track === "general" ? "active" : ""} onClick={() => { setTrack("general"); }}>
          {t({ en: "General Engineering", es: "Ingeniería General" }, locale)}
        </button>
        <button role="tab" aria-selected={track === "ai"} className={track === "ai" ? "active" : ""} onClick={() => { setTrack("ai"); }}>
          {t({ en: "Real World AI", es: "IA en el Mundo Real" }, locale)}
        </button>
      </div>

      <div className="ws-layout">
        {/* Sidebar */}
        <aside className="ws-sidebar">
          <div className="sb-title">{t({ en: "Domains", es: "Dominios" }, locale)}</div>
          {domains.map((d) => {
            const pct = domainPct(d, progress);
            return (
              <button key={d.id} className={`sb-domain ${openId === d.id ? "active" : ""}`}
                onClick={() => setOpenId(openId === d.id ? "" : d.id)}>
                <ProgressRing pct={pct} size={22} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(AXIS_BY_ID[d.axisId].short, locale)}</span>
                <span className="sb-weight">{pct}%</span>
              </button>
            );
          })}
          <div className="sb-ladder">
            <div className="sb-title" style={{ padding: 0 }}>{t({ en: "The ladder", es: "La escalera" }, locale)}</div>
            <div className="sb-ladder-row">
              {LEVELS.map((lv) => (
                <span key={lv} className="sb-ladder-chip">{lv}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* Main: numbered domain cards */}
        <div>
          {domains.map((d, i) => (
            <DomainCard key={d.id} dom={d} index={i + 1} locale={locale} progress={progress}
              open={openId === d.id} onToggle={() => setOpenId(openId === d.id ? "" : d.id)}
              onRead={(slug) => { markConceptRead(slug); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DomainCard({ dom, index, locale, progress, open, onToggle, onRead }: {
  dom: CurriculumDomain; index: number; locale: Locale; progress: Progress | null;
  open: boolean; onToggle: () => void; onRead: (slug: string) => void;
}) {
  const axis = AXIS_BY_ID[dom.axisId];
  const allConcepts = dom.levels.flatMap((l) => l.concepts);
  const readCount = allConcepts.filter((c) => progress?.conceptsRead.includes(c.slug)).length;
  const grad = AXIS_GRAD[dom.axisId];
  return (
    <div className={`gc-domain ${open ? "open" : ""}`} data-track={dom.id === "ai-engineering" ? "ai" : "general"}>
      <button className="gc-domain-head" onClick={onToggle} aria-expanded={open}>
        <span className="gc-domain-bar" style={{ background: grad }} />
        <span className="gc-domain-badge" style={{ background: grad }}>{index}</span>
        <span className="gc-domain-meta">
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 700 }}>{t(axis.name, locale)}</h2>
          <span className="gc-domain-sub">{t(axis.measures, locale)}</span>
        </span>
        <span className="gc-domain-weight">
          <span className="w">{readCount}/{allConcepts.length}</span>
          <span className="l" style={{ display: "block" }}>{t({ en: "reviewed", es: "leídos" }, locale)}</span>
        </span>
        <span className="gc-domain-chevron">⌄</span>
      </button>
      {open && (
        <div className="gc-domain-body-inner">
          {LEVELS.map((level) => {
            const lvl = dom.levels.find((l) => l.level === level);
            if (!lvl || lvl.concepts.length === 0) return null;
            const chk = checkpointsAfter(dom.id, level);
            const cleared = chk ? progress?.checkpointsCleared.includes(chk.id) : false;
            return (
              <div key={level}>
                <div className="gc-band-head">
                  <span className={`gc-concept-tag lchip lchip-${level}`}>{level}</span>
                  <span className="gc-band-name">{t(LEVEL_LABEL[level], locale).split("·")[1]?.trim()} — {t(lvl.intent, locale).split(".")[0]}.</span>
                </div>
                {lvl.concepts.map((c) => {
                  const read = progress?.conceptsRead.includes(c.slug);
                  return (
                    <Link key={c.slug} href={`/${locale}/lesson/${dom.id}-${level.toLowerCase()}`}
                      className="gc-concept" data-read={read ? "true" : "false"}
                      onClick={() => onRead(c.slug)} title={t(c.why, locale)}>
                      <span className="gc-concept-check" aria-hidden="true">{read ? "✓" : ""}</span>
                      <span className="gc-concept-title">{t(c.title, locale)}</span>
                      <span className={`gc-concept-tag lchip lchip-${level}`}>{level}</span>
                      <span className="gc-concept-chevron">›</span>
                    </Link>
                  );
                })}
                {chk && (
                  <Link href={`/${locale}/checkpoint/${chk.id}`} className="gc-boss" data-cleared={cleared ? "true" : "false"}>
                    <span className="gc-boss-ico" aria-hidden="true">{cleared ? "✓" : "◆"}</span>
                    <span className="gc-boss-title">
                      {cleared
                        ? t({ en: "Final Boss cleared", es: "Jefe final superado" }, locale)
                        : `${t({ en: "Final Boss", es: "Jefe final" }, locale)} · ${level} — ${LEVEL_WHAT[level] ? t(LEVEL_WHAT[level], locale).split("—")[0].trim() : ""}`}
                    </span>
                    <span className="gc-concept-chevron">›</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function domainPct(dom: CurriculumDomain, progress: Progress | null): number {
  const all = dom.levels.flatMap((l) => l.concepts);
  if (!all.length) return 0;
  const read = all.filter((c) => progress?.conceptsRead.includes(c.slug)).length;
  return Math.round((read / all.length) * 100);
}

function ProgressRing({ pct, size }: { pct: number; size: number }) {
  const deg = Math.round((pct / 100) * 360);
  return (
    <span className="sb-ring ring" style={{
      width: size, height: size, flex: "none",
      background: `conic-gradient(var(--amber) ${deg}deg, var(--hairline-2) ${deg}deg)`,
    }}>
      <span style={{ width: size - 8, height: size - 8, borderRadius: "50%", background: "var(--surface)" }} />
    </span>
  );
}
