import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { m, t } from "@/lib/i18n";
import { domainIndex, getArchitectureMap, getConcept, type MapGroup } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { Icon } from "@/components/Icon";
import { MasteredDot } from "@/components/Mastered";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  const map = getArchitectureMap();
  return { title: t(map.title, locale), description: t(map.subtitle, locale) };
}

function Chips({ group, locale }: { group: MapGroup; locale: Locale }) {
  return (
    <div className="al-items">
      {group.items.map((id) => {
        const c = getConcept(id)!;
        return (
          <Link key={id} href={`/${locale}/c/${id}/`} className="arch-chip" title={t(c.tldr, locale)}
            style={{ ["--h" as string]: hueFor(domainIndex(c.domain)) }}>
            <MasteredDot id={id} />{t(c.title, locale)}
          </Link>
        );
      })}
    </div>
  );
}

export default async function MapPage({ params }: P) {
  const { locale } = await params;
  const map = getArchitectureMap();
  const hub = getConcept(map.hub);
  return (
    <main className="page map-page">
      <header className="page-head plain">
        <div>
          <p className="eyebrow">{locale === "es" ? "Arquitectura" : "Architecture"}</p>
          <h1>{t(map.title, locale)}</h1>
          <p className="page-sub">{t(map.subtitle, locale)}</p>
          {hub && (
            <div className="hero-ctas">
              <Link className="btn btn-primary" href={`/${locale}/c/${hub.id}/`}>
                {t(hub.title, locale)} <Icon name="right" size={16} />
              </Link>
              <Link className="btn" href={`/${locale}/d/architecture/`}><Icon name="layers" size={16} /> {m("navDomains", locale)}: {locale === "es" ? "Arquitectura" : "Architecture"}</Link>
            </div>
          )}
        </div>
      </header>

      <div className="arch">
        <div className="arch-stack">
          <div className="arch-flow" aria-hidden="true">{locale === "es" ? "request ↓" : "request ↓"}</div>
          {map.layers.map((g, i) => (
            <section key={g.id} className="arch-layer" aria-labelledby={`al-${g.id}`}>
              <div className="al-head">
                <span className="al-n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h2 id={`al-${g.id}`}>{t(g.title, locale)}</h2>
                  {g.note && <p>{t(g.note, locale)}</p>}
                </div>
              </div>
              <Chips group={g} locale={locale} />
            </section>
          ))}
        </div>
        <aside className="arch-cross" aria-label={locale === "es" ? "Transversal" : "Cross-cutting"}>
          <p className="arch-cross-label">{locale === "es" ? "Transversal a todas las capas" : "Across every layer"}</p>
          {map.crosscutting.map((g) => (
            <section key={g.id} className="arch-band" aria-labelledby={`ab-${g.id}`}>
              <h2 id={`ab-${g.id}`}>{t(g.title, locale)}</h2>
              <Chips group={g} locale={locale} />
            </section>
          ))}
        </aside>
      </div>
      <p className="legend">{locale === "es" ? "El color de cada caja es el de su tema. Pasa el cursor para ver la frase clave." : "Each box takes its topic's color. Hover for the one-liner."}</p>
    </main>
  );
}
