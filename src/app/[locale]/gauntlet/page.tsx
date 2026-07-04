import { isLocale, type Locale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { CodeRedTeam } from "@/components/CodeRedTeam";
import { LOCALES } from "@/i18n/config";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function GauntletPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <section className="wrap" style={{ paddingTop: "var(--s-12)", paddingBottom: "var(--s-16)" }}>
      <CodeRedTeam locale={locale as Locale} />
    </section>
  );
}
