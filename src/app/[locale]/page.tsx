import { isLocale, type Locale, t } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LandingChart } from "@/components/LandingChart";
import { Reveal } from "@/components/Motion";
import { LEVELS, LEVEL_LABEL, type Level } from "@/lib/axes";
import { ORDERED_DOMAINS, totalConcepts, CHECKPOINTS } from "@/lib/curriculum";
import { AXIS_BY_ID } from "@/lib/axes";

const C = {
  eyebrow: { en: "The second half of an engineering career", es: "La segunda mitad de una carrera de ingeniería" },
  h1a: { en: "The judgment to go from Senior toward ", es: "El criterio para pasar de Senior hacia " },
  h1accent: { en: "Staff and Principal.", es: "Staff y Principal." },
  sub: {
    en: "AI writes the routine 70%. The promotion past Senior is decided in the 30% it can't judge for you. This is the guide to that 30% — a level-by-level climb from Developing to Principal, where each rung has a role mandate, lessons with diagrams and interactive widgets, and checks that make you build real architectures, not just pick answers. Clear a level's checkpoints to unlock the next. Bilingual, EN/ES.",
    es: "La IA escribe el 70% rutinario. El ascenso más allá de Senior se decide en el 30% que no puede juzgar por ti. Esta es la guía de ese 30% — una subida nivel a nivel de En Desarrollo a Principal, donde cada peldaño tiene un mandato de rol, lecciones con diagramas y widgets interactivos, y comprobaciones que te hacen construir arquitecturas reales, no solo elegir respuestas. Supera los puntos de control de un nivel para desbloquear el siguiente. Bilingüe, EN/ES.",
  },
  startTitle: { en: "Two ways to start", es: "Dos formas de empezar" },
  pathAnum: { en: "Path A", es: "Ruta A" },
  pathAtitle: { en: "Start from the beginning", es: "Empezar desde el principio" },
  pathAhelp: { en: "New to this? Begin at L3 and climb the ladder one stage at a time. Best if you'd rather build the full foundation.", es: "¿Recién empiezas? Comienza en L3 y sube la escalera etapa por etapa. Ideal si prefieres construir toda la base." },
  pathActa: { en: "Open the guide", es: "Abrir la guía" },
  pathBnum: { en: "Path B", es: "Ruta B" },
  pathBtitle: { en: "Place me with a quiz", es: "Ubícame con un quiz" },
  pathBhelp: { en: "Answer a short scenario diagnostic and we'll drop you at the right level and domain. Best if you already have experience.", es: "Responde un diagnóstico breve de escenarios y te ubicamos en el nivel y dominio correctos. Ideal si ya tienes experiencia." },
  pathBcta: { en: "Take the diagnostic", es: "Hacer el diagnóstico" },
  how: { en: "How the climb works", es: "Cómo funciona la subida" },
  s1t: { en: "Start where you stand", es: "Empieza donde estás" },
  s1d: { en: "Each level opens with a role mandate — what a Senior, Staff, or Principal is trusted to do. You always know why you're here.", es: "Cada nivel abre con un mandato de rol — lo que se confía a un Senior, Staff o Principal. Siempre sabes por qué estás aquí." },
  s2t: { en: "Learn, quick-check, build", es: "Aprende, comprueba, construye" },
  s2d: { en: "Every concept has an explanation, a diagram or interactive widget, and checks — including assembling real architectures, not just picking answers.", es: "Cada concepto trae explicación, un diagrama o widget interactivo, y comprobaciones — incluido armar arquitecturas reales, no solo elegir respuestas." },
  s3t: { en: "Clear the level to ascend", es: "Supera el nivel para subir" },
  s3d: { en: "To rise a level you must clear checkpoints across most domains — breadth, not one grind. The next stage stays locked until you do.", es: "Para subir de nivel debes superar puntos de control en la mayoría de los dominios — amplitud, no una sola veta. La siguiente etapa sigue bloqueada hasta lograrlo." },
  climb: { en: "The five levels", es: "Los cinco niveles" },
  domainsTitle: { en: "Six domains", es: "Seis dominios" },
} as const;

const LEVEL_WHAT: Record<Level, { en: string; es: string }> = {
  L3: { en: "Build the foundations.", es: "Construye las bases." },
  L4: { en: "Own your area's design.", es: "Dueño del diseño de tu área." },
  L5: { en: "Set a team's approach.", es: "Fija el enfoque de un equipo." },
  L6: { en: "Direct multiple teams.", es: "Dirige varios equipos." },
  L7: { en: "Shape org strategy.", es: "Moldea la estrategia." },
};

export default async function Landing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const L = locale as Locale;

  const stats: { n: string; l: { en: string; es: string } }[] = [
    { n: String(totalConcepts()), l: { en: "concepts", es: "conceptos" } },
    { n: String(ORDERED_DOMAINS.length), l: { en: "domains", es: "dominios" } },
    { n: String(LEVELS.length), l: { en: "levels", es: "niveles" } },
    { n: String(CHECKPOINTS.length), l: { en: "final bosses", es: "jefes finales" } },
  ];

  return (
    <>
      {/* HERO — an optional decorative art layer (public/hero/ascent.webp) is
          referenced as a masked CSS background. If the file is absent the browser
          silently shows the authored radial wash + star chart underneath, so the
          hero always reads as intentional whether or not the art exists. */}
      <section style={{ position: "relative", overflow: "clip" }}>
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(90% 120% at 78% 8%, var(--gen-glow), transparent 60%), url(/hero/ascent.webp)",
          backgroundRepeat: "no-repeat, no-repeat",
          backgroundPosition: "center, right -6% top -10%",
          backgroundSize: "cover, min(46%, 620px) auto",
          opacity: 0.5,
          maskImage: "linear-gradient(180deg, transparent 0, #000 18%, #000 62%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0, #000 18%, #000 62%, transparent 100%)",
        }} />
        <div className="wrap" style={{ position: "relative", zIndex: 1, paddingTop: "var(--s-16)", paddingBottom: "var(--s-12)" }}>
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow" style={{ marginBottom: "var(--s-5)" }}>{t(C.eyebrow, L)}</p>
              <h1 className="display" style={{ fontSize: "var(--t-hero)", marginBottom: "var(--s-6)" }}>
                {t(C.h1a, L)}<span className="accent">{t(C.h1accent, L)}</span>
              </h1>
              <p className="prose" style={{ fontSize: "1.125rem", marginBottom: "var(--s-8)" }}>{t(C.sub, L)}</p>

              {/* Primary actions + trust stats — gives the first screen a clear CTA */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-3)", marginBottom: "var(--s-8)" }}>
                <Link href={`/${L}/learn`} className="btn btn-primary" style={{ fontSize: "1rem", padding: "var(--s-3) var(--s-6)" }}>
                  {t(C.pathActa, L)} →
                </Link>
                <Link href={`/${L}/assess`} className="btn" style={{ fontSize: "1rem", padding: "var(--s-3) var(--s-6)" }}>
                  {t(C.pathBcta, L)}
                </Link>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-6)", borderTop: "1px solid var(--hairline)", paddingTop: "var(--s-5)" }}>
                {stats.map((s, i) => (
                  <div key={i}>
                    <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1, color: "var(--text)" }}>{s.n}</div>
                    <div className="eyebrow" style={{ marginTop: 5 }}>{t(s.l, L)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-viz blueprint"><LandingChart locale={L} /></div>
          </div>
        </div>
      </section>

      {/* TWO START PATHS — the fork, made physical */}
      <section className="wrap" style={{ padding: "var(--s-8) var(--s-6) var(--s-12)" }}>
        <p className="eyebrow" style={{ marginBottom: "var(--s-5)" }}>{t(C.startTitle, L)}</p>
        <div className="start-cards">
          <Link href={`/${L}/learn`} className="start-path primary">
            <span className="sp-num">{t(C.pathAnum, L)}</span>
            <span className="sp-title">{t(C.pathAtitle, L)}</span>
            <span className="sp-help">{t(C.pathAhelp, L)}</span>
            <span className="sp-cta">{t(C.pathActa, L)} →</span>
          </Link>
          <Link href={`/${L}/assess`} className="start-path">
            <span className="sp-num">{t(C.pathBnum, L)}</span>
            <span className="sp-title">{t(C.pathBtitle, L)}</span>
            <span className="sp-help">{t(C.pathBhelp, L)}</span>
            <span className="sp-cta">{t(C.pathBcta, L)} →</span>
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: "var(--bg-2)", borderBlock: "1px solid var(--hairline)" }}>
        <div className="wrap" style={{ padding: "var(--s-12) var(--s-6)" }}>
          <p className="eyebrow" style={{ marginBottom: "var(--s-6)" }}>{t(C.how, L)}</p>
          <div className="steps-grid">
            {[[C.s1t, C.s1d], [C.s2t, C.s2d], [C.s3t, C.s3d]].map(([tt, dd], i) => (
              <Reveal as="div" key={i} index={i} className="step-card">
                <span className="step-badge">{i + 1}</span>
                <div>
                  <strong style={{ fontFamily: "var(--font-head)", fontSize: "1rem", display: "block", marginBottom: 4 }}>{t(tt, L)}</strong>
                  <p style={{ fontSize: "var(--t-sm)", color: "var(--text-2)" }}>{t(dd, L)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* THE FIVE LEVELS */}
      <section className="wrap" style={{ padding: "var(--s-12) var(--s-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--s-5)", flexWrap: "wrap", gap: "var(--s-2)" }}>
          <p className="eyebrow">{t(C.climb, L)}</p>
          <Link href={`/${L}/ladder`} className="eyebrow" style={{ color: "var(--amber)" }}>{t({ en: "See the full ladder", es: "Ver la escalera completa" }, L)} →</Link>
        </div>
        <div className="climb-strip">
          {LEVELS.map((lv) => (
            <div key={lv} className="climb-rung">
              <div className="cr-code">{lv}</div>
              <div className="cr-name">{t(LEVEL_LABEL[lv], L).split("·")[1]?.trim()}</div>
              <div className="cr-what">{t(LEVEL_WHAT[lv], L)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SIX DOMAINS */}
      <section className="wrap" style={{ padding: "0 var(--s-6) var(--s-16)" }}>
        <p className="eyebrow" style={{ marginBottom: "var(--s-5)" }}>{t(C.domainsTitle, L)} · {totalConcepts()} {t({ en: "concepts", es: "conceptos" }, L)} · {CHECKPOINTS.length} {t({ en: "bosses", es: "jefes" }, L)}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--s-3)" }}>
          {ORDERED_DOMAINS.map((d, i) => (
            <Link key={d.id} href={`/${L}/learn`} className="card card-interactive" style={{ padding: "var(--s-4)", display: "flex", gap: "var(--s-3)", alignItems: "flex-start" }}>
              <span className="mono" style={{ color: "var(--amber)", fontWeight: 700 }}>{i + 1}</span>
              <div>
                <strong style={{ fontFamily: "var(--font-head)", fontSize: "var(--t-sm)" }}>{t(AXIS_BY_ID[d.axisId].name, L)}</strong>
                <p className="dim" style={{ fontSize: "var(--t-xs)", marginTop: 3, lineHeight: 1.4 }}>{t(AXIS_BY_ID[d.axisId].measures, L)}</p>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: "var(--s-8)", textAlign: "center" }}>
          <Link href={`/${L}/learn`} className="btn btn-primary" style={{ fontSize: "1rem", padding: "var(--s-4) var(--s-8)" }}>
            {t(C.pathActa, L)} →
          </Link>
        </div>
      </section>
    </>
  );
}
