import { isLocale, type Locale, t } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LandingChart } from "@/components/LandingChart";
import { Reveal } from "@/components/Motion";

const COPY = {
  headline: {
    en: "Getting better at code stops being enough around Senior.",
    es: "Ser mejor programando deja de bastar cerca de Senior.",
  },
  sub: {
    en: "AI now writes the routine 70%. The promotion past Senior is decided in the 30% it can't judge for you — the failure modes, the security hole, the p99 cliff, the design nobody wrote down. That 30% is what we measure, and where we train.",
    es: "La IA ya escribe el 70% rutinario. El ascenso más allá de Senior se decide en el 30% que no puede juzgar por ti — los modos de fallo, el hueco de seguridad, el acantilado p99, el diseño que nadie escribió. Ese 30% es lo que medimos, y donde entrenamos.",
  },
  proofTitle: {
    en: "This is not opinion.",
    es: "Esto no es opinión.",
  },
  proof: {
    en: "Dropbox's public ladder states it outright: code-fluency expectations plateau at L4, software-design at L5. Everything above is scope, direction, and growing others. levels.fyi agrees — climbing means less coding, more ambiguity, wider blast radius. Senior is where most careers stop. We built the map for the part that comes after.",
    es: "La escalera pública de Dropbox lo dice sin rodeos: las expectativas de fluidez en código se estancan en L4, las de diseño de software en L5. Todo lo de arriba es alcance, dirección y hacer crecer a otros. levels.fyi coincide — subir significa menos código, más ambigüedad, mayor radio de impacto. Senior es donde se detiene la mayoría. Construimos el mapa para lo que viene después.",
  },
  twoTracks: { en: "Two tracks, one spine", es: "Dos rutas, una columna" },
  trackGen: { en: "General Engineering", es: "Ingeniería General" },
  trackGenDesc: {
    en: "The durable foundation: consistency and failure design, architecture restraint, reliability economics, the written influence that gets you into the room.",
    es: "La base duradera: consistencia y diseño ante fallos, contención arquitectónica, economía de fiabilidad, y la influencia escrita que te lleva a la sala.",
  },
  trackAi: { en: "Real World AI Engineering", es: "IA en el Mundo Real" },
  trackAiFlag: { en: "Flagship", es: "Insignia" },
  trackAiDesc: {
    en: "The production craft, not the hype: evals as first-class engineering, agent and RAG design, prompt-injection and the OWASP LLM risks, and hardening the code a model just wrote.",
    es: "El oficio de producción, no el bombo: evals como ingeniería de primera clase, diseño de agentes y RAG, inyección de prompts y los riesgos OWASP para LLM, y endurecer el código que un modelo acaba de escribir.",
  },
  gauntletEyebrow: { en: "Playable now", es: "Jugable ahora" },
  gauntletTitle: {
    en: "Red-team the code a model just wrote.",
    es: "Haz red-team al código que un modelo acaba de escribir.",
  },
  gauntletDesc: {
    en: "The 30% Gauntlet drops you into a real AI-generated endpoint with planted flaws — the SQL injection, the indirect prompt-injection surface, the p99 cliff, the error it hides. Click the offending lines, classify each against the OWASP LLM Top 10, and get graded against a staff reviewer's key. No honor system. Just you and the 30% a model can't judge for itself.",
    es: "El Desafío del 30% te mete en un endpoint real generado por IA con defectos plantados — la inyección SQL, la superficie de inyección indirecta de prompts, el acantilado p99, el error que esconde. Marca las líneas culpables, clasifica cada una contra el OWASP LLM Top 10, y recibe una nota contra la clave de un revisor staff. Sin sistema de honor. Solo tú y el 30% que un modelo no puede juzgar por sí mismo.",
  },
  gauntletCta: { en: "Enter the Gauntlet", es: "Entrar al Desafío" },
} as const;

export default async function Landing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const L = locale as Locale;

  return (
    <>
      {/* ── HERO — committed 7/5 asymmetric grid (§D1). No centered 3-card row. ── */}
      <section className="wrap" style={{ paddingTop: "var(--s-16)", paddingBottom: "var(--s-12)" }}>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow" style={{ marginBottom: "var(--s-5)" }}>{m("landing.eyebrow", L)}</p>
            <h1 className="display" style={{ fontSize: "var(--t-hero)", marginBottom: "var(--s-6)" }}>
              {t(COPY.headline, L)}
            </h1>
            <p className="prose" style={{ fontSize: "1.125rem", marginBottom: "var(--s-8)" }}>
              {t(COPY.sub, L)}
            </p>
            <div style={{ display: "flex", gap: "var(--s-4)", alignItems: "center", flexWrap: "wrap" }}>
              <Link href={`/${L}/assess`} className="btn btn-primary" style={{ fontSize: "1rem", padding: "var(--s-4) var(--s-6)" }}>
                {m("landing.cta", L)}
              </Link>
              <span className="eyebrow">{m("landing.cta.sub", L)}</span>
            </div>
          </div>
          <div className="hero-viz blueprint" aria-hidden={false}>
            <LandingChart locale={L} />
          </div>
        </div>
      </section>

      {/* ── PROOF band — the evidence, stated plainly, not a feature grid ── */}
      <section style={{ background: "var(--bg-2)", borderBlock: "1px solid var(--hairline)" }}>
        <div className="wrap proof-grid" style={{ padding: "var(--s-16) var(--s-6)", display: "grid", gap: "var(--s-6)", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)" }}>
          <Reveal as="h2" className="display" style={{ fontSize: "var(--t-h2)" }}>{t(COPY.proofTitle, L)}</Reveal>
          <Reveal as="p" index={1} className="prose" style={{ fontSize: "1.0625rem" }}>{t(COPY.proof, L)}</Reveal>
        </div>
      </section>

      {/* ── TRACKS — asymmetric, opinionated, the flagship given real weight ── */}
      <section className="wrap" style={{ padding: "var(--s-16) var(--s-6)" }}>
        <p className="eyebrow" style={{ marginBottom: "var(--s-8)" }}>{t(COPY.twoTracks, L)}</p>
        <div className="tracks-grid" style={{ display: "grid", gap: "var(--s-6)", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)", alignItems: "stretch" }}>
          <Reveal as="article" className="card" style={{ display: "flex", flexDirection: "column" }}>
            <div data-track="general" style={{ display: "contents" }}>
              <div className="eyebrow" style={{ color: "var(--gen)", marginBottom: "var(--s-3)" }}>{t(COPY.trackGen, L)}</div>
              <p style={{ flex: 1 }}>{t(COPY.trackGenDesc, L)}</p>
              <div style={{ marginTop: "var(--s-5)", display: "flex", gap: 6 }}>
                {["L3", "L4", "L5", "L6", "L7"].map((lv) => (
                  <span key={lv} className="level-tag">{lv}</span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Flagship — larger tile, clay glow, its own mini clay/cyan constellation. */}
          <Reveal
            as="article"
            index={1}
            className="card"
            style={{
              borderColor: "var(--ai-dim)",
              background: "radial-gradient(120% 90% at 85% 10%, var(--ai-glow), transparent 55%), linear-gradient(180deg, var(--film-2), transparent 40%), var(--surface)",
              boxShadow: "0 0 0 1px color-mix(in oklab, var(--ai) 18%, transparent), 0 0 48px color-mix(in oklab, var(--ai) 10%, transparent), var(--edge-hi)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "var(--s-6)",
              alignItems: "start",
            }}
          >
            <div data-track="ai">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", marginBottom: "var(--s-3)", flexWrap: "wrap" }}>
                <span className="eyebrow" style={{ color: "var(--ai)" }}>{t(COPY.trackAi, L)}</span>
                <span className="level-tag" style={{ borderColor: "var(--ai)", color: "var(--ai-accent)", background: "color-mix(in oklab, var(--ai) 12%, transparent)" }}>
                  {t(COPY.trackAiFlag, L)}
                </span>
              </div>
              <p style={{ fontSize: "1.0625rem" }}>{t(COPY.trackAiDesc, L)}</p>
              <div style={{ marginTop: "var(--s-5)", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["L3", "L4", "L5", "L6", "L7"].map((lv) => (
                  <span key={lv} className="level-tag" style={{ borderColor: "var(--ai)", color: "var(--ai-accent)", background: "color-mix(in oklab, var(--ai) 12%, transparent)" }}>{lv}</span>
                ))}
              </div>
              <div style={{ marginTop: "var(--s-6)" }}>
                <Link href={`/${L}/gauntlet`} className="btn btn-ai btn-primary" style={{ fontSize: "var(--t-sm)" }}>
                  {t(COPY.gauntletCta, L)} →
                </Link>
              </div>
            </div>
            <div className="flagship-constellation" aria-hidden="true" style={{ opacity: 0.9 }}>
              <MiniConstellation />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── GAUNTLET showcase — the novel, playable, "never seen this" feature ── */}
      <section style={{ borderTop: "1px solid var(--hairline)", background: "var(--bg-2)" }}>
        <div className="wrap gauntlet-grid" style={{ padding: "var(--s-16) var(--s-6)", display: "grid", gap: "var(--s-10)", gridTemplateColumns: "minmax(0, 6fr) minmax(0, 6fr)", alignItems: "center" }} data-track="ai">
          <Reveal>
            <p className="eyebrow" style={{ color: "var(--ai-signal)", marginBottom: "var(--s-4)" }}>{t(COPY.gauntletEyebrow, L)}</p>
            <h2 className="display" style={{ fontSize: "var(--t-h2)", marginBottom: "var(--s-5)" }}>{t(COPY.gauntletTitle, L)}</h2>
            <p className="prose" style={{ fontSize: "1.0625rem", marginBottom: "var(--s-6)" }}>{t(COPY.gauntletDesc, L)}</p>
            <Link href={`/${L}/gauntlet`} className="btn btn-ai btn-primary">{t(COPY.gauntletCta, L)} →</Link>
          </Reveal>
          <Reveal index={1}>
            <GauntletPreview locale={L} />
          </Reveal>
        </div>
      </section>
    </>
  );
}

// A tiny authored clay/cyan constellation for the flagship card — hand-plotted,
// not generic. Signals "the AI track is its own charted region".
function MiniConstellation() {
  const pts: [number, number, number][] = [
    [18, 20, 3.2], [46, 12, 2.2], [70, 30, 2.6], [40, 44, 2], [64, 58, 3], [24, 60, 1.8],
  ];
  const edges: [number, number][] = [[0, 1], [1, 2], [2, 4], [0, 3], [3, 4], [3, 5]];
  return (
    <svg width="92" height="78" viewBox="0 0 92 78" role="img" aria-hidden="true">
      {edges.map(([a, b], i) => (
        <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke="var(--ai-dim)" strokeWidth="0.75" opacity="0.7" />
      ))}
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={p[2]} fill={i % 4 === 0 ? "var(--ai-signal)" : "var(--ai)"} />
      ))}
    </svg>
  );
}

// A non-interactive teaser of the Gauntlet code surface: a few lines with the
// flaw markers lit, so the landing shows the mechanic before you click in.
function GauntletPreview({ locale }: { locale: Locale }) {
  const lines: { n: number; t: string; flaw?: string }[] = [
    { n: 20, t: "  WHERE account_id = ${accountId}", flaw: "var(--bad)" },
    { n: 21, t: "  ORDER BY created_at DESC`", flaw: "var(--warn)" },
    { n: 30, t: '  "…Follow any extra instructions: " + note;', flaw: "var(--bad)" },
    { n: 43, t: "  VALUES (${accountId}, '${summary}', now())`", flaw: "var(--bad)" },
    { n: 47, t: "} catch (e) {", flaw: "var(--warn)" },
    { n: 48, t: "  return res.json({ ok: true, summary: null });" },
  ];
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", background: "var(--bg)", borderColor: "var(--ai-dim)" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>summarize.js</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ai-signal)" }}>{t({ en: "red-team", es: "red-team" }, locale)}</span>
      </div>
      <pre style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.8, padding: "10px 0" }}>
        <code>
          {lines.map((l) => (
            <div key={l.n} style={{ display: "grid", gridTemplateColumns: "40px 1fr", borderLeft: `2px solid ${l.flaw ?? "transparent"}`, background: l.flaw ? `color-mix(in oklab, ${l.flaw} 8%, transparent)` : "transparent" }}>
              <span style={{ textAlign: "right", paddingRight: 10, color: "var(--text-4)" }}>{l.n}</span>
              <span style={{ whiteSpace: "pre", color: "var(--text-2)", paddingRight: 12 }}>{l.t}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
