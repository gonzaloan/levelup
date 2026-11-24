import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { t } from "@/lib/i18n";
import { getConcept, getLabs } from "@/lib/content";
import { Icon } from "@/components/Icon";
import { Spotlight } from "@/components/Spotlight";
import { Emoji } from "@/components/Visual";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/labs/", "Labs", locale === "es" ? "Simuladores interactivos: cambia un parámetro y mira qué se mueve." : "Interactive simulators: change one thing and watch what moves.");
}

export default async function LabsPage({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  const labs = getLabs();
  return (
    <main className="page labs-page">
      <header className="page-head plain">
        <div>
          <h1>Labs</h1>
          <p className="page-sub">{es ? "Sistemas que puedes tocar: cambia un parámetro y mira qué se mueve. Todo corre en tu navegador." : "Systems you can touch: change one thing and watch what moves. Everything runs in your browser."}</p>
        </div>
      </header>
      <Spotlight className="lab-cards">
        {labs.map((l) => (
          <Link key={l.id} href={`/${locale}/labs/${l.id}/`} className="lab-card">
            <span className="lc-art"><Emoji name={l.art} size={40} /><span className="lc-icon"><Icon name={l.icon} size={18} /></span></span>
            <strong>{t(l.title, locale)}</strong>
            <span className="lc-blurb">{t(l.blurb, locale)}</span>
            <span className="lc-concepts">{l.concepts.slice(0, 3).map((c) => t(getConcept(c)?.title, locale)).filter(Boolean).join(" · ")}</span>
          </Link>
        ))}
      </Spotlight>
    </main>
  );
}
