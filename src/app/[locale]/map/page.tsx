import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { MapView } from "@/components/MapView";
import { MODULES } from "@/content/registry";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="wrap" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)" }}>
      <MapView locale={locale as Locale} modules={MODULES} />
    </div>
  );
}
