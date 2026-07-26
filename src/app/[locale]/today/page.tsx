import type { Metadata } from "next";
import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { TodayView } from "@/components/TodayView";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const es = locale === "es";
  return {
    title: es ? "Hoy · Level Up" : "Today · Level Up",
    description: es
      ? "Un concepto nuevo al día, una comprobación práctica y repaso espaciado — el camino de Senior a Staff/Principal, un informe diario a la vez."
      : "One new concept a day, a hands-on check, and spaced review — the climb from Senior toward Staff/Principal, one brief at a time.",
  };
}

// The daily brief. Static shell + client hydration: the day key and progress are
// browser facts, so the page ships a neutral skeleton and fills in on mount.
export default async function TodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <TodayView locale={locale as Locale} />;
}
