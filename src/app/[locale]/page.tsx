import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { m, t } from "@/lib/i18n";
import { allConcepts, getConcept, getPath, getProblems } from "@/lib/content";
import { Today, type PathStop } from "@/components/Today";

// Hoy: one next step (docs/specs/simplify.md). A first-time reader sees two lines of pitch above
// the mission; a returning one (data-returning, set before paint by the root layout) only the mission.
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/", m("brand", locale), m("heroSub", locale), { absolute: true });
}

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const es = locale === "es";
  const order: PathStop[] = getPath().flatMap((p) => p.modules.flatMap((mod) => mod.concepts.map((id) => ({ id, t: t(getConcept(id)!.title, locale), m: t(mod.title, locale) }))));
  return (
    <main className="home today-page">
      <section className="hero-pitch">
        <h1>{m("heroTitle", locale)}</h1>
        <p className="hero-sub">{es
          ? `${allConcepts().length} conceptos y ${getProblems().length} problemas de código, en una ruta. Una misión corta por día.`
          : `${allConcepts().length} concepts and ${getProblems().length} coding problems, in one path. One short mission a day.`}</p>
      </section>
      <h2 className="today-h1">{es ? "Hoy" : "Today"}</h2>
      <Today order={order} locale={locale} />
    </main>
  );
}
