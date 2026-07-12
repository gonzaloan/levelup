import { isLocale, type Locale, LOCALES, t } from "@/i18n/config";
import { notFound } from "next/navigation";
import { BuildGallery } from "@/components/BuildGallery";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// The Build Lab: hands-on architecture assembly. The flagship constructive check
// — you don't pick the right answer, you build it, and a deterministic grader
// scores the topology (required components, required connections, anti-patterns).
export default async function BuildPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const L = locale as Locale;

  return (
    <div className="wrap" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)" }}>
      <p className="eyebrow">{t({ en: "The Build Lab", es: "El Laboratorio de Diseño" }, L)}</p>
      <h1 className="display" style={{ fontSize: "var(--t-h1)", margin: "var(--s-2) 0 var(--s-4)" }}>
        {t({ en: "Don't pick the architecture. Build it.", es: "No elijas la arquitectura. Constrúyela." }, L)}
      </h1>
      <p className="prose" style={{ marginBottom: "var(--s-8)", maxWidth: 680 }}>
        {t({
          en: "Assemble each system from real components and wire the connections. We grade the topology you build — the parts that must be there, the connections that must exist, and the anti-patterns that must not. Tap a component, tap a slot; tap two nodes to connect them.",
          es: "Arma cada sistema con componentes reales y conecta las relaciones. Evaluamos la topología que construyes — las piezas que deben estar, las conexiones que deben existir y los anti-patrones que no. Toca un componente, toca un espacio; toca dos nodos para conectarlos.",
        }, L)}
      </p>
      <BuildGallery locale={L} />
    </div>
  );
}
