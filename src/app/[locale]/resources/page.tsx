import type { Metadata } from "next";
import { isLocale, type Locale, LOCALES } from "@/i18n/config";
import { notFound } from "next/navigation";
import { ResourceBrowser } from "@/components/ResourceBrowser";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const es = locale === "es";
  return {
    title: es ? "Lista de lectura · Level Up" : "Reading list · Level Up",
    description: es
      ? "Fuentes primarias curadas para ingenieros Staff/Principal: papers, documentación oficial, charlas y artículos de los equipos que construyeron los sistemas."
      : "Curated primary sources for Staff/Principal engineers: papers, official docs, talks, and posts from the teams that built the systems.",
  };
}

export default async function ResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ResourceBrowser locale={locale as Locale} />;
}
