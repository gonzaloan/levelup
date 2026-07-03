import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { AssessRunner } from "@/components/AssessRunner";
import { ITEMS, ROOMS } from "@/content/registry";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function AssessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const L = locale as Locale;

  return (
    <div className="wrap" style={{ paddingTop: "var(--s-12)", paddingBottom: "var(--s-16)", maxWidth: 820 }}>
      <AssessRunner locale={L} items={ITEMS} rooms={ROOMS} />
    </div>
  );
}
