import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { m, t } from "@/lib/i18n";
import { conceptsOf, getDomains } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { norm } from "@/lib/search";
import { Markdown } from "@/components/Markdown";
import { Filter } from "@/components/Filter";

// The numbers to know, from every concept's "numbers", filterable by topic (Library).
type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/numbers/", m("numbersBank", locale), locale === "es" ? "Las cifras que conviene saber de memoria, por tema, con el concepto de donde salen." : "The figures worth knowing by heart, by topic, with the concept each comes from.");
}

export default async function Numbers({ params }: P) {
  const { locale } = await params;
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const domains = getDomains();
  return (
    <main className="page interview">
      <header className="page-head plain"><div><h1>{L("numbersBank")}</h1></div></header>
      <section>
                <Filter scope="numbers" placeholder={L("filter")} allLabel={L("all")}
          domains={domains.map((d, i) => ({ id: d.id, title: t(d.title, locale), hue: hueFor(i) }))} />
        <div id="numbers" className="numbers-bank">
          {domains.map((d, i) => (
            <div key={d.id} data-section className="nb-domain" style={{ ["--h" as string]: hueFor(i) }}>
              <h3>{t(d.title, locale)}</h3>
              <ul>
                {conceptsOf(d.id).flatMap((c) => (c.numbers ?? []).map((x, j) => (
                  <li key={`${c.id}-${j}`} data-domain={d.id} data-filter={norm(t(x, locale) + " " + t(c.title, locale))}>
                    <Markdown inline src={t(x, locale)} locale={locale} />{" "}
                    <Link href={`/${locale}/c/${c.id}/`} className="nb-src">{t(c.title, locale)}</Link>
                  </li>
                )))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
