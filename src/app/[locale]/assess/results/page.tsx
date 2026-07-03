import { isLocale, type Locale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { ResultsView } from "@/components/ResultsView";
import { LOCALES } from "@/i18n/config";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function ResultsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="wrap" style={{ paddingTop: "var(--s-12)", paddingBottom: "var(--s-16)" }}>
      <ResultsView locale={locale as Locale} />
    </div>
  );
}
