import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { Icon } from "@/components/Icon";
import { CodeMock } from "@/components/practice/CodeMock";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return locale === "es"
    ? pageMeta(locale, "/practice/code/mock/", "Simulacro de coding", "Dos problemas, 45 minutos, sin pistas: una ronda de coding como la real, en tu navegador.")
    : pageMeta(locale, "/practice/code/mock/", "Mock coding interview", "Two problems, 45 minutes, no hints: a coding round like the real one, in your browser.");
}

export default async function MockPage({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  return (
    <main className="page problem-page">
      <p className="crumbs-line"><Link href={`/${locale}/practice/code/`}><Icon name="left" size={14} /> {es ? "Coding en Python" : "Python coding"}</Link></p>
      <header className="page-head plain">
        <div><h1>{es ? "Simulacro de coding" : "Mock coding interview"}</h1></div>
      </header>
      <CodeMock locale={locale} />
    </main>
  );
}
