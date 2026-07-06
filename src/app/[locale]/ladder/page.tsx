import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { LadderView } from "@/components/LadderView";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LadderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LadderView locale={locale as Locale} />;
}
