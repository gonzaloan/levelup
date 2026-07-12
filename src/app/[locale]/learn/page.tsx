import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { LearnShell } from "@/components/LearnShell";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LearnPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LearnShell locale={locale as Locale} />;
}
