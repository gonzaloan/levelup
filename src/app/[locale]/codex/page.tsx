import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { CodexView } from "@/components/CodexView";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function CodexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CodexView locale={locale as Locale} />;
}
