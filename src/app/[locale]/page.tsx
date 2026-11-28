import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { m, t } from "@/lib/i18n";
import { allConcepts, getConcept, getPath, getProblems } from "@/lib/content";
import { Today, type PathStop } from "@/components/Today";

// Hoy: one next step (docs/specs/simplify.md). A first-time reader sees two lines of pitch above
// the mission; a returning one (data-returning, set before paint by the root layout) only the mission.
// The page's h1 is for screen readers: the tab already says where you are.
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/", m("brand", locale), m("heroSub", locale), { absolute: true });
}

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const es = locale === "es";
  const order: PathStop[] = getPath().flatMap((p) => p.modules.flatMap((mod) => mod.concepts.map((id) => ({ id, t: t(getConcept(id)!.title, locale), m: t(mod.title, locale) }))));
  return (
    <main className="page today-page">
      <h1 className="sr-only">{es ? "Hoy" : "Today"}</h1>
      <section className="hero-pitch">
        <p className="pitch-title">{es ? "Prepara tu entrevista Staff y AI Architect" : "Prepare for Staff and AI Architect interviews"}</p>
        <p className="hero-sub">{es
          ? `${allConcepts().length} conceptos y ${getProblems().length} problemas en una ruta. Una misión corta al día.`
          : `${allConcepts().length} concepts and ${getProblems().length} problems in one path. One short mission a day.`}</p>
      </section>
      <Today order={order} locale={locale} />
    </main>
  );
}
