"use client";
// The Curriculum — the definitive, ordered "learn everything" plan.
//
// This is the structural answer to "how do I actually learn this?": six domains,
// five levels (L3→L7), read as an ordered climb. The default "By level" view is
// the recommended path — you build the L3 band across every domain and clear its
// checkpoint before rising to L4 (interleaved spiral, per the learning-science
// research). "By domain" pivots to a single-axis deep dive. Concepts that have a
// deep authored module are marked and link straight in; every level band ends in
// a checkpoint gate.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { LEVELS, LEVEL_LABEL, AXIS_BY_ID, type Level } from "@/lib/axes";
import {
  ORDERED_DOMAINS, checkpointsAfter, totalConcepts, CHECKPOINTS, learningPath,
} from "@/lib/curriculum";
import type { CurriculumDomain, Concept } from "@/lib/types";
import { load, type Progress } from "@/lib/store";
import { PixelOverworld } from "./PixelOverworld";

// The lesson a domain×level cluster maps to (the primary learning unit).
function lessonHref(locale: Locale, domainId: string, level: Level): string {
  return `/${locale}/lesson/${domainId}-${level.toLowerCase()}`;
}

type ViewMode = "level" | "domain";

const AXIS_COLOR: Record<number, string> = {
  1: "var(--gen)", 2: "var(--gen-accent)", 3: "var(--ai-signal)",
  4: "var(--star)", 5: "var(--gen-accent)", 6: "var(--ai)",
};

// Per-domain vivid gradients for the cert cards (get-certified's distinct
// teal/blue/green/gold/clay tiles, so no two domains look interchangeable).
const AXIS_GRAD: Record<number, string> = {
  1: "linear-gradient(135deg,#0a3b6e 0%,#1d6fd6 55%,#4c9fff 100%)",
  2: "linear-gradient(135deg,#0a237a 0%,#1565c0 52%,#42a5f5 100%)",
  3: "linear-gradient(135deg,#054b52 0%,#0f8f8f 50%,#2fd0c8 100%)",
  4: "linear-gradient(135deg,#6e5406 0%,#b8860b 50%,#e8b53a 100%)",
  5: "linear-gradient(135deg,#1f5c2e 0%,#2f8f3f 52%,#6daa2c 100%)",
  6: "linear-gradient(135deg,#6e2f1c 0%,#b3583b 46%,#d97757 78%,#35d0e0 100%)",
};

export function CurriculumView({ locale }: { locale: Locale }) {
  // In pixel theme, the curriculum IS the overworld map.
  const [pixel, setPixel] = useState(false);
  useEffect(() => {
    const check = () => setPixel(document.documentElement.getAttribute("data-theme") === "pixel");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const [mode, setMode] = useState<ViewMode>("level");
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    setProgress(load());
    const on = () => setProgress(load());
    window.addEventListener("levelup:progress", on);
    return () => window.removeEventListener("levelup:progress", on);
  }, []);

  const stats = useMemo(() => ({
    concepts: totalConcepts(),
    checkpoints: CHECKPOINTS.length,
    domains: ORDERED_DOMAINS.length,
    levels: LEVELS.length,
  }), []);

  if (pixel) return <PixelOverworld locale={locale} />;

  return (
    <div className="wrap" style={{ paddingTop: "var(--s-12)", paddingBottom: "var(--s-16)" }}>
      <p className="eyebrow">{m("path.eyebrow", locale)}</p>
      <h1 className="display" style={{ fontSize: "var(--t-h1)", margin: "var(--s-2) 0 var(--s-5)" }}>
        {m("path.title", locale)}
      </h1>
      <p className="prose" style={{ fontSize: "1.0625rem", marginBottom: "var(--s-6)" }}>
        {m("path.intro", locale)}
      </p>

      {/* Start here — the single obvious entry point. Resumes if you've begun. */}
      <StartHere locale={locale} progress={progress} />

      {/* Instrument stat rail */}
      <div style={{ display: "flex", gap: "var(--s-6)", flexWrap: "wrap", marginBottom: "var(--s-8)" }}>
        <Stat n={stats.concepts} label={m("path.concepts", locale)} />
        <Stat n={stats.checkpoints} label={m("path.checkpoints", locale)} />
        <Stat n={stats.levels} label={m("path.levels", locale)} />
        <Stat n={stats.domains} label={m("path.domains", locale)} />
      </div>

      {/* View toggle + diagnostic hint */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--s-4)", flexWrap: "wrap", marginBottom: "var(--s-8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
          <span className="eyebrow">{m("path.viewBy", locale)}</span>
          <div style={{ display: "inline-flex", border: "1px solid var(--hairline-2)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
            {(["level", "domain"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setMode(v)}
                aria-pressed={mode === v}
                style={{
                  fontFamily: "var(--font-head)", fontWeight: 600, fontSize: "var(--t-sm)",
                  padding: "var(--s-2) var(--s-4)", border: "none", cursor: "pointer",
                  background: mode === v ? "var(--surface-3)" : "transparent",
                  color: mode === v ? "var(--text)" : "var(--text-3)",
                }}>
                {v === "level" ? m("path.byLevel", locale) : m("path.byDomain", locale)}
              </button>
            ))}
          </div>
        </div>
        <Link href={`/${locale}/assess`} className="eyebrow" style={{ color: "var(--gen)", maxWidth: 420, textAlign: "right", lineHeight: 1.5, textTransform: "none", letterSpacing: 0 }}>
          {m("path.diagnosticHint", locale)} →
        </Link>
      </div>

      {mode === "level"
        ? <ByLevel locale={locale} progress={progress} />
        : <ByDomain locale={locale} progress={progress} />}
    </div>
  );
}

// The single obvious entry point. If the learner has cleared some checkpoints,
// it becomes a "resume" that points at the first not-yet-cleared lesson in the
// recommended order; otherwise it points at the very first lesson.
function StartHere({ locale, progress }: { locale: Locale; progress: Progress | null }) {
  const path = useMemo(() => learningPath(), []);
  const firstConcept = path.find((s) => s.kind === "concept");
  // find first lesson whose checkpoint isn't cleared yet
  const cleared = new Set(progress?.checkpointsCleared ?? []);
  const resumeStep = path.find(
    (s) => s.kind === "checkpoint" && !cleared.has(s.ref)
  );
  const started = (progress?.checkpointsCleared.length ?? 0) > 0 || (progress?.conceptsRead.length ?? 0) > 0;
  const target = resumeStep ?? firstConcept;
  if (!target) return null;
  const href = lessonHref(locale, target.domainId, target.level);
  const axis = AXIS_BY_ID[target.axisId];
  return (
    <div className="card start-here" style={{ marginBottom: "var(--s-8)" }}>
      <div className="start-here-body">
        <p className="eyebrow" style={{ color: "var(--track-accent, var(--gen-accent))" }}>
          {started ? m("path.continueClimb", locale) : m("path.startHereTitle", locale)}
        </p>
        <p className="prose" style={{ marginTop: "var(--s-2)", marginBottom: "var(--s-4)" }}>
          {started
            ? `${t(axis.name, locale)} · ${target.level}`
            : m("path.startHereBody", locale)}
        </p>
        <Link href={href} className="btn btn-primary" style={{ fontSize: "1rem", padding: "var(--s-4) var(--s-6)" }}>
          {started ? m("path.resume", locale) : m("path.startFirst", locale)} →
        </Link>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="stat" style={{ fontSize: "var(--t-h2)", color: "var(--text)", lineHeight: 1 }}>{n}</div>
      <div className="eyebrow" style={{ marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── By level: the recommended ordered climb ─────────────────────────────────
// Each level band shows all six domains side by side; you read across the band,
// then the band's checkpoints gate the rise to the next level.
function ByLevel({ locale, progress }: { locale: Locale; progress: Progress | null }) {
  return (
    <div className="stack" style={{ gap: "var(--s-10)" }}>
      {LEVELS.map((level, i) => (
        <LevelBand key={level} level={level} index={i} locale={locale} progress={progress} />
      ))}
    </div>
  );
}

function LevelBand({ level, index, locale, progress }: { level: Level; index: number; locale: Locale; progress: Progress | null }) {
  const domainsWithLevel = ORDERED_DOMAINS
    .map((d) => ({ dom: d, lvl: d.levels.find((l) => l.level === level) }))
    .filter((x) => x.lvl && x.lvl.concepts.length > 0);

  // A band's checkpoints cleared count → the band's completion.
  const bandCheckpoints = domainsWithLevel
    .map((x) => checkpointsAfter(x.dom.id, level))
    .filter(Boolean) as NonNullable<ReturnType<typeof checkpointsAfter>>[];
  const cleared = bandCheckpoints.filter((c) => progress?.checkpointsCleared.includes(c.id)).length;
  const bandPct = bandCheckpoints.length ? Math.round((cleared / bandCheckpoints.length) * 100) : 0;

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--s-4)", marginBottom: "var(--s-5)", flexWrap: "wrap", borderBottom: "1px solid var(--hairline)", paddingBottom: "var(--s-3)" }}>
        <span className="display" style={{ fontSize: "var(--t-h2)", color: "var(--text)" }}>{level}</span>
        <span style={{ color: "var(--text-2)", fontFamily: "var(--font-head)", fontWeight: 500 }}>
          {t(LEVEL_LABEL[level], locale).split("·")[1]?.trim() ?? t(LEVEL_LABEL[level], locale)}
        </span>
        {index === 0 && (
          <span className="level-tag" style={{ marginLeft: "auto" }}>{m("path.startHere", locale)}</span>
        )}
        {bandCheckpoints.length > 0 && index !== 0 && (
          <span className="eyebrow" style={{ marginLeft: "auto" }}>
            {cleared}/{bandCheckpoints.length} {m("path.checkpoints", locale)} · {bandPct}%
          </span>
        )}
      </div>

      <div className="path-band-grid">
        {domainsWithLevel.map(({ dom, lvl }) => {
          const chk = checkpointsAfter(dom.id, level);
          const chkCleared = chk ? progress?.checkpointsCleared.includes(chk.id) : false;
          // whole cell links to the lesson — the primary learning unit.
          const conceptsRead = lvl!.concepts.filter((c) => progress?.conceptsRead.includes(c.slug)).length;
          return (
            <Link key={dom.id} href={lessonHref(locale, dom.id, level)}
              data-track={dom.id === "ai-engineering" ? "ai" : "general"}
              className="card card-interactive path-cell"
              style={{ padding: "var(--s-4)", display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: AXIS_COLOR[dom.axisId], flex: "none" }} />
                <span className="eyebrow" style={{ color: "var(--text-2)" }}>{t(AXIS_BY_ID[dom.axisId].short, locale)}</span>
                {chkCleared && <span className="eyebrow" style={{ marginLeft: "auto", color: "var(--ok)" }}>✓</span>}
              </div>
              <div className="stack" style={{ gap: "var(--s-2)", flex: 1 }}>
                {lvl!.concepts.map((c) => (
                  <div key={c.slug} className="concept-row" style={{ display: "flex", alignItems: "flex-start", gap: 8 }} title={t(c.why, locale)}>
                    <span aria-hidden="true" className="concept-tick" data-on={progress?.conceptsRead.includes(c.slug) ? "true" : "false"} />
                    <span style={{ flex: 1, fontSize: "var(--t-sm)", color: progress?.conceptsRead.includes(c.slug) ? "var(--text)" : "var(--text-2)", lineHeight: 1.35 }}>
                      {t(c.title, locale)}
                    </span>
                  </div>
                ))}
              </div>
              <span className="chk-chip" data-cleared={chkCleared ? "true" : "false"} aria-hidden="true">
                <span className="chk-diamond">◆</span>
                <span>{chkCleared ? m("path.cleared", locale) : `${m("path.openLesson", locale)}${conceptsRead ? ` · ${conceptsRead}/${lvl!.concepts.length}` : ""}`}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── By domain: vivid cert-card grid (get-certified look) + deep accordion ──
function ByDomain({ locale, progress }: { locale: Locale; progress: Progress | null }) {
  const [openId, setOpenId] = useState<string>("");
  const cleared = new Set(progress?.checkpointsCleared ?? []);
  return (
    <div className="stack" style={{ gap: "var(--s-8)" }}>
      <div className="cert-cards">
        {ORDERED_DOMAINS.map((dom) => {
          const axis = AXIS_BY_ID[dom.axisId];
          const concepts = dom.levels.reduce((a, l) => a + l.concepts.length, 0);
          const domCheckpoints = LEVELS.map((lv) => checkpointsAfter(dom.id, lv)).filter(Boolean);
          const clearedN = domCheckpoints.filter((c) => cleared.has(c!.id)).length;
          const pct = domCheckpoints.length ? Math.round((clearedN / domCheckpoints.length) * 100) : 0;
          const firstLevel = LEVELS.find((lv) => dom.levels.find((l) => l.level === lv)?.concepts.length) ?? "L3";
          return (
            <Link key={dom.id} href={lessonHref(locale, dom.id, firstLevel)}
              className="cert-card" style={{ background: AXIS_GRAD[dom.axisId] }}>
              <span className="cc-code">{t(axis.short, locale)}</span>
              <span className="cc-title">{t(axis.name, locale)}</span>
              <span className="cc-sub">{t(axis.measures, locale)}</span>
              <div className="cc-stats">
                <span className="cc-stat"><span className="n">{concepts}</span><span className="l">{m("path.concepts", locale)}</span></span>
                <span className="cc-stat"><span className="n">{domCheckpoints.length}</span><span className="l">{m("path.checkpoints", locale)}</span></span>
                <span className="cc-stat"><span className="n">{pct}%</span><span className="l">{m("path.progress", locale)}</span></span>
              </div>
              <div className="cc-progress"><i style={{ ["--pct" as string]: `${pct}%` }} /></div>
              <span className="cc-go" aria-hidden="true">→</span>
            </Link>
          );
        })}
      </div>
      <div className="stack" style={{ gap: "var(--s-4)" }}>
        {ORDERED_DOMAINS.map((dom) => (
          <DomainPanel key={dom.id} dom={dom} locale={locale} progress={progress}
            open={openId === dom.id} onToggle={() => setOpenId(openId === dom.id ? "" : dom.id)} />
        ))}
      </div>
    </div>
  );
}

function DomainPanel({ dom, locale, progress, open, onToggle }: {
  dom: CurriculumDomain; locale: Locale; progress: Progress | null; open: boolean; onToggle: () => void;
}) {
  const axis = AXIS_BY_ID[dom.axisId];
  const totalC = dom.levels.reduce((a, l) => a + l.concepts.length, 0);
  return (
    <div className="card" data-track={dom.id === "ai-engineering" ? "ai" : "general"} style={{ padding: 0, overflow: "hidden" }}>
      <button onClick={onToggle} aria-expanded={open}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "var(--s-4) var(--s-5)", display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: AXIS_COLOR[dom.axisId], flex: "none" }} />
        <span style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: "1.0625rem", color: "var(--text)" }}>
          {t(axis.name, locale)}
        </span>
        <span className="eyebrow" style={{ marginLeft: "auto" }}>{totalC} {m("path.concepts", locale)}</span>
        <span aria-hidden="true" style={{ color: "var(--text-3)", transform: open ? "rotate(90deg)" : "none", transition: "transform var(--base) var(--eout)" }}>›</span>
      </button>
      {open && (
        <div style={{ padding: "0 var(--s-5) var(--s-5)", borderTop: "1px solid var(--hairline)" }}>
          <p className="dim" style={{ fontSize: "var(--t-sm)", margin: "var(--s-4) 0" }}>{t(axis.measures, locale)}</p>
          <div className="stack" style={{ gap: "var(--s-5)" }}>
            {LEVELS.map((level) => {
              const lvl = dom.levels.find((l) => l.level === level);
              if (!lvl || lvl.concepts.length === 0) return null;
              const chk = checkpointsAfter(dom.id, level);
              const chkCleared = chk ? progress?.checkpointsCleared.includes(chk.id) : false;
              return (
                <div key={level}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "var(--s-3)", marginBottom: "var(--s-3)", flexWrap: "wrap" }}>
                    <span className="level-tag">{level}</span>
                    <span className="dim" style={{ fontSize: "var(--t-sm)", flex: 1 }}>{t(lvl.intent, locale)}</span>
                    <Link href={lessonHref(locale, dom.id, level)} className="eyebrow" style={{ color: "var(--track, var(--gen))" }}>
                      {chkCleared ? `✓ ${m("path.cleared", locale)}` : m("path.openLesson", locale)} →
                    </Link>
                  </div>
                  <div className="path-concept-grid">
                    {lvl.concepts.map((c) => (
                      <ConceptCard key={c.slug} concept={c} locale={locale} progress={progress} lessonHref={lessonHref(locale, dom.id, level)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ConceptCard({ concept, locale, progress, lessonHref }: { concept: Concept; locale: Locale; progress: Progress | null; lessonHref: string }) {
  const read = progress?.conceptsRead.includes(concept.slug) || (concept.moduleId && progress?.mastered.includes(concept.moduleId));
  return (
    <Link href={lessonHref}>
      <div className="concept-card" data-read={read ? "true" : "false"}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <strong style={{ fontSize: "var(--t-sm)", fontFamily: "var(--font-head)", fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
            {t(concept.title, locale)}
          </strong>
          {read && <span style={{ color: "var(--ok)", flex: "none", fontSize: "0.7rem" }}>✓</span>}
        </div>
        <p style={{ fontSize: "var(--t-xs)", color: "var(--text-3)", marginTop: 6, lineHeight: 1.45 }}>{t(concept.why, locale)}</p>
      </div>
    </Link>
  );
}
