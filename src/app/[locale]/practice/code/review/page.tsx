import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { Icon } from "@/components/Icon";
import { CodeReview } from "@/components/practice/CodeReview";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return locale === "es"
    ? pageMeta(locale, "/practice/code/review/", "Re-resolver de memoria", "Los problemas que ya resolviste vuelven espaciados: a los 3 días, luego a los 7, 16, 35 y 75.")
    : pageMeta(locale, "/practice/code/review/", "Re-solve from memory", "Problems you solved come back spaced out: after 3 days, then 7, 16, 35 and 75.");
}

export default async function ReviewPage({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  return (
    <main className="page problem-page">
      <p className="crumbs-line"><Link href={`/${locale}/practice/code/`}><Icon name="left" size={14} /> {es ? "Coding en Python" : "Python coding"}</Link></p>
      <header className="page-head plain">
        <div>
          <h1>{es ? "Re-resolver de memoria" : "Re-solve from memory"}</h1>
          <p className="page-sub">{es
            ? "Resolverlo una vez no basta: lo que no repites se olvida. Cada problema que resolviste vuelve a los 3 días, luego a los 7, 16, 35 y 75 si lo sigues resolviendo sin ayuda."
            : "Solving it once isn't enough: what you don't repeat fades. Each problem you solved comes back after 3 days, then 7, 16, 35 and 75 while you keep solving it unaided."}</p>
        </div>
      </header>
      <CodeReview locale={locale} />
    </main>
  );
}
