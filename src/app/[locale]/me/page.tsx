import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { MeView } from "@/components/MeView";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function MePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="wrap" style={{ paddingTop: "var(--s-12)", paddingBottom: "var(--s-16)", maxWidth: 820 }}>
      <MeView locale={locale as Locale} />
    </div>
  );
}
