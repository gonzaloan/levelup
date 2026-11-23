import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { pageMeta } from "@/lib/meta";
import { t } from "@/lib/i18n";
import { domainIndex, getConcept, getDomains } from "@/lib/content";
import { hueFor } from "@/lib/hue";
import { knowledgeGraph } from "@/lib/graph";

type P = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale } = await params;
  return pageMeta(locale, "/graph/", locale === "es" ? "Mapa del conocimiento" : "Knowledge map", locale === "es" ? "Todos los conceptos como un mapa: territorios por tema y puentes entre ideas." : "Every concept as a map: territories by topic and bridges between ideas.");
}

// Hub concepts (most connected) keep their label visible; the rest show it on hover/focus.
const LABELLED = 28;

export default async function GraphPage({ params }: P) {
  const { locale } = await params;
  const es = locale === "es";
  const g = knowledgeGraph();
  const domains = getDomains();
  const hubs = new Set([...g.nodes].sort((a, b) => b.degree - a.degree).slice(0, LABELLED).map((n) => n.id));
  return (
    <main className="page graph-page">
      <header className="page-head plain">
        <div>
          <h1>{es ? "Mapa del conocimiento" : "Knowledge map"}</h1>
          <p className="page-sub">{es
            ? `Los ${g.nodes.length} conceptos como un territorio: cada color es un tema y cada línea une ideas relacionadas. Toca un punto para abrirlo.`
            : `All ${g.nodes.length} concepts as a territory: each color is a topic and each line links related ideas. Tap a dot to open it.`}</p>
        </div>
      </header>
      <div className="graph-wrap">
        <svg className="graph" viewBox={`0 0 ${g.width} ${g.height}`} role="img" aria-label={es ? "Mapa de conceptos relacionados" : "Map of related concepts"}>
          <g className="g-edges">
            {g.edges.map((e, i) => <line key={i} x1={g.nodes[e.a].x} y1={g.nodes[e.a].y} x2={g.nodes[e.b].x} y2={g.nodes[e.b].y} />)}
          </g>
          {g.nodes.map((n) => {
            const c = getConcept(n.id)!;
            const title = t(c.title, locale);
            return (
              <a key={n.id} href={`/${locale}/c/${n.id}/`} className={`gn${hubs.has(n.id) ? " hub" : ""}`} style={{ ["--h" as string]: hueFor(domainIndex(n.domain)) }}>
                <title>{title}</title>
                <circle cx={n.x} cy={n.y} r={n.r} />
                <text x={n.x} y={n.y - n.r - 4} textAnchor="middle">{title.length > 34 ? `${title.slice(0, 32)}…` : title}</text>
              </a>
            );
          })}
          {g.labels.map((l) => {
            const d = domains.find((x) => x.id === l.domain)!;
            return <text key={l.domain} className="g-domain" x={l.x} y={l.y} textAnchor="middle" style={{ ["--h" as string]: hueFor(domainIndex(l.domain)) }}>{t(d.title, locale)}</text>;
          })}
        </svg>
      </div>
      <ul className="graph-legend">
        {domains.map((d, i) => (
          <li key={d.id} style={{ ["--h" as string]: hueFor(i) }}><Link href={`/${locale}/d/${d.id}/`}><span className="gl-dot" />{t(d.title, locale)}</Link></li>
        ))}
      </ul>
    </main>
  );
}
