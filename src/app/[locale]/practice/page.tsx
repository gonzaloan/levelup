import { isLocale, type Locale, LOCALES, t } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ORDERED_DOMAINS, CHECKPOINTS } from "@/lib/curriculum";
import { AXIS_BY_ID } from "@/lib/axes";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Practice: a low-stakes place to re-drill any level's checkpoint (no gating,
// no unlocks) — pick a domain, jump into any of its final-boss quizzes to test
// yourself. Kept intentionally simple: a grid of the 30 checkpoints by domain.
export default async function PracticePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const L = locale as Locale;

  return (
    <div className="wrap" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)", maxWidth: 900 }}>
      <p className="eyebrow">{t({ en: "Practice", es: "Práctica" }, L)}</p>
      <h1 className="display" style={{ fontSize: "var(--t-h1)", margin: "var(--s-2) 0 var(--s-4)" }}>
        {t({ en: "Test yourself, no stakes.", es: "Ponte a prueba, sin presión." }, L)}
      </h1>
      <p className="prose" style={{ marginBottom: "var(--s-8)" }}>
        {t({ en: "Re-take any level's scenario quiz to keep it sharp. Nothing locks; the rationale teaches on every miss.", es: "Repite el quiz de escenarios de cualquier nivel para mantenerlo fresco. Nada se bloquea; la explicación enseña en cada error." }, L)}
      </p>

      {ORDERED_DOMAINS.map((dom) => {
        const chks = CHECKPOINTS.filter((c) => c.domainId === dom.id);
        if (!chks.length) return null;
        return (
          <section key={dom.id} style={{ marginBottom: "var(--s-8)" }}>
            <h2 style={{ fontSize: "1.0625rem", marginBottom: "var(--s-3)" }}>{t(AXIS_BY_ID[dom.axisId].name, L)}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
              {chks.sort((a, b) => a.afterLevel.localeCompare(b.afterLevel)).map((c) => (
                <Link key={c.id} href={`/${L}/checkpoint/${c.id}`} className="gc-concept-tag"
                  style={{ padding: "8px 14px", textDecoration: "none", borderColor: "var(--hairline-2)", color: "var(--text-2)" }}>
                  {c.afterLevel} · {c.items.length}Q
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
