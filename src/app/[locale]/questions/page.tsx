import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { m, t } from "@/lib/i18n";
import { conceptsOf, getDomains } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { norm } from "@/lib/search";
import { Markdown } from "@/components/Markdown";
import { Filter } from "@/components/Filter";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return { title: m("questionBank", locale) };
}

export default async function Questions({ params }: P) {
  const { locale } = await params;
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const domains = getDomains();
  return (
    <main className="page questions">
      <header className="page-head plain">
        <div>
          <h1>{L("questionBank")}</h1>
          <p className="page-sub">{L("interviewHint")}</p>
        </div>
      </header>
      <Filter scope="qbank" placeholder={L("filter")} allLabel={L("all")}
        domains={domains.map((d, i) => ({ id: d.id, title: t(d.title, locale), hue: hueFor(i) }))} />
      <div id="qbank">
        {domains.map((d, i) => (
          <section key={d.id} data-section style={{ ["--h" as string]: hueFor(i) }}>
            <h2>{t(d.title, locale)}</h2>
            <div className="qa-list">
              {conceptsOf(d.id).flatMap((c) => c.interview.map((x, j) => (
                <details key={`${c.id}-${j}`} className="qa" data-domain={d.id} data-filter={norm(t(x.q, locale) + " " + t(c.title, locale) + " " + c.aliases.join(" "))}>
                  <summary>
                    <span className="qa-q">{t(x.q, locale)}</span>
                    <span className="qa-reveal">{L("showAnswer")}</span>
                  </summary>
                  <Markdown src={t(x.a, locale)} locale={locale} className="qa-a" />
                  <Link href={`/${locale}/c/${c.id}/`} className="qa-concept">{t(c.title, locale)} →</Link>
                </details>
              )))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
