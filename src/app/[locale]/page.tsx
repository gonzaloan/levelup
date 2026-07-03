import { isLocale, type Locale, t } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LandingChart } from "@/components/LandingChart";

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
        <div className="wrap" style={{ padding: "var(--s-16) var(--s-6)", display: "grid", gap: "var(--s-6)", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)" }}>
          <h2 className="display" style={{ fontSize: "var(--t-h2)" }}>{t(COPY.proofTitle, L)}</h2>
          <p className="prose" style={{ fontSize: "1.0625rem" }}>{t(COPY.proof, L)}</p>
        </div>
      </section>

      {/* ── TRACKS — asymmetric, opinionated, flagship marked ── */}
      <section className="wrap" style={{ padding: "var(--s-16) var(--s-6)" }}>
        <p className="eyebrow" style={{ marginBottom: "var(--s-8)" }}>{t(COPY.twoTracks, L)}</p>
        <div style={{ display: "grid", gap: "var(--s-6)", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <article className="card" data-track="general">
            <div className="eyebrow" style={{ color: "var(--gen)", marginBottom: "var(--s-3)" }}>{t(COPY.trackGen, L)}</div>
            <p>{t(COPY.trackGenDesc, L)}</p>
            <div style={{ marginTop: "var(--s-5)", display: "flex", gap: 6 }}>
              {["L3", "L4", "L5", "L6", "L7"].map((lv) => (
                <span key={lv} className="level-tag">{lv}</span>
              ))}
            </div>
          </article>
          <article className="card" data-track="ai" style={{ borderColor: "var(--ai-dim)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", marginBottom: "var(--s-3)" }}>
              <span className="eyebrow" style={{ color: "var(--ai)" }}>{t(COPY.trackAi, L)}</span>
              <span className="level-tag" style={{ borderColor: "var(--ai)", color: "var(--ai-accent)", background: "color-mix(in oklab, var(--ai) 12%, transparent)" }}>
                {t(COPY.trackAiFlag, L)}
              </span>
            </div>
            <p>{t(COPY.trackAiDesc, L)}</p>
            <div style={{ marginTop: "var(--s-5)", display: "flex", gap: 6 }}>
              {["L3", "L4", "L5", "L6", "L7"].map((lv) => (
                <span key={lv} className="level-tag" style={{ borderColor: "var(--ai)", color: "var(--ai-accent)", background: "color-mix(in oklab, var(--ai) 12%, transparent)" }}>{lv}</span>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
