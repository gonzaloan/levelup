import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { m, t } from "@/lib/i18n";
import { conceptsOf, getDomains } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { norm } from "@/lib/search";
import { Filter } from "@/components/Filter";
import { LevelBadge } from "@/components/Bits";
import { Markdown } from "@/components/Markdown";
import { Icon } from "@/components/Icon";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return { title: m("cheatsheetTitle", locale), description: m("cheatsheetSub", locale) };
}

export default async function Cheatsheet({ params }: P) {
  const { locale } = await params;
  const L = (k: Parameters<typeof m>[0]) => m(k, locale);
  const domains = getDomains();
  return (
    <main className="page cheatsheet">
      <header className="page-head plain">
        <div>
          <h1>{L("cheatsheetTitle")}</h1>
          <p className="page-sub">{L("cheatsheetSub")}</p>
        </div>
      </header>
      <Filter scope="sheet" placeholder={L("filter")} allLabel={L("all")} printLabel={L("print")}
        domains={domains.map((d, i) => ({ id: d.id, title: t(d.title, locale), hue: hueFor(i) }))}
        levels={(["core", "advanced", "staff"] as const).map((l) => ({ id: l, label: L(`level_${l}`) }))} />
      <div id="sheet">
        {domains.map((d, i) => (
          <section key={d.id} data-section className="sheet-domain" style={{ ["--h" as string]: hueFor(i) }}>
            <h2><Icon name={d.icon} size={18} /> {t(d.title, locale)}</h2>
            <div className="sheet-rows">
              {conceptsOf(d.id).map((c) => (
                <div key={c.id} className="sheet-row" data-domain={d.id} data-level={c.level}
                  data-filter={norm([c.title.en, c.title.es, c.aliases.join(" "), t(c.tldr, locale)].join(" "))}>
                  <div className="sr-head">
                    <Link href={`/${locale}/c/${c.id}/`} className="sr-title">{t(c.title, locale)}</Link>
                    <LevelBadge level={c.level} locale={locale} />
                  </div>
                  <p className="sr-tldr">{t(c.tldr, locale)}</p>
                  {c.numbers && c.numbers.length > 0 && (
                    <ul className="sr-numbers">
                      {c.numbers.slice(0, 3).map((x, j) => <li key={j}><Markdown inline src={t(x, locale)} locale={locale} /></li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
