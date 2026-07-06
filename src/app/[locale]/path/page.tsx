import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Redirect } from "@/components/Redirect";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Retired: the curriculum lives in /learn now.
export default async function PathPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Redirect to={`/${locale as Locale}/learn`} />;
}
