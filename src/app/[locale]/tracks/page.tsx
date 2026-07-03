import { isLocale, type Locale, LOCALES, t } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MODULES } from "@/content/registry";
import { AXIS_BY_ID } from "@/lib/axes";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function TracksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const L = locale as Locale;
  const general = MODULES.filter((m) => m.track === "general").sort((a, b) => a.order - b.order);

  return (
    <div className="wrap" style={{ paddingTop: "var(--s-12)", paddingBottom: "var(--s-16)" }}>
      <p className="eyebrow">{t({ en: "Tracks", es: "Rutas" }, L)}</p>
      <h1 className="display" style={{ fontSize: "var(--t-h1)", margin: "var(--s-2) 0 var(--s-8)" }}>
        {t({ en: "Two tracks, one competency spine.", es: "Dos rutas, una columna de competencias." }, L)}
      </h1>

      <section data-track="general" style={{ marginBottom: "var(--s-12)" }}>
        <h2 style={{ color: "var(--gen)", marginBottom: "var(--s-4)" }}>{t({ en: "General Engineering — L5 The Staff Threshold", es: "Ingeniería General — L5 El Umbral Staff" }, L)}</h2>
        <div className="stack">
          {general.map((mod) => (
            <Link key={mod.id} href={`/${L}/module/${mod.id}`} className="card" style={{ display: "block", padding: "var(--s-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--s-3)", flexWrap: "wrap" }}>
                <strong style={{ fontFamily: "var(--font-head)" }}>
                  <span className="mono dim" style={{ marginRight: 8 }}>M{mod.order}</span>{t(mod.title, L)}
                </strong>
                <span className="eyebrow">{t(AXIS_BY_ID[mod.axis.primary].short, L)}</span>
              </div>
              <p className="dim" style={{ fontSize: "var(--t-sm)", marginTop: "var(--s-2)" }}>{t(mod.tagline, L)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section data-track="ai">
        <div style={{ display: "flex", gap: "var(--s-3)", alignItems: "center", marginBottom: "var(--s-4)" }}>
          <h2 style={{ color: "var(--ai)" }}>{t({ en: "Real World AI Engineering", es: "IA en el Mundo Real" }, L)}</h2>
          <span className="level-tag" style={{ borderColor: "var(--ai)", color: "var(--ai-accent)" }}>{t({ en: "Flagship", es: "Insignia" }, L)}</span>
        </div>
        <p className="prose">
          {t({ en: "The flagship track is charting. Its signature Field Work — the 30% Gauntlet, where you harden code a model just wrote against prompt injection and the OWASP LLM risks — is live now inside the General track. The full AI curriculum lands next.", es: "La ruta insignia se está trazando. Su Trabajo de Campo distintivo — el Desafío del 30%, donde endureces código que un modelo acaba de escribir contra inyección de prompts y los riesgos OWASP para LLM — ya está activo dentro de la ruta General. El temario completo de IA llega a continuación." }, L)}
        </p>
      </section>
    </div>
  );
}
