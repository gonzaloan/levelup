"use client";
/**
 * The Codex — the AI-Architect reference surface.
 *
 * Three modes over one dataset, because "look something up" and "learn this
 * front to back" are genuinely different tasks and forcing one UI to serve both
 * serves neither:
 *
 *   BROWSE  clusters in a sidebar, entries as a scannable list. The default.
 *   PATH    the derived reading order, drawn as a LAYERED SPINE. Prerequisites
 *           run bottom-up; each band is one depth level.
 *   SEARCH  diacritic-folded matching over terms and definitions.
 *
 * Why a layered spine and not a node graph: the entry DAG is shallow and narrow
 * (a handful of layers, a few entries per layer, no cross-cluster cycles), which
 * is the ideal input for layered drawing — depth becomes vertical position, so the
 * direction of flow is readable without tracing a single edge. A force-directed
 * layout would throw that away, and would draw a different picture on every load,
 * which breaks the project's determinism rule outright. `codexPath()` computes the
 * layering from the data, so the drawing cannot drift from the prerequisites.
 *
 * The layout is a single column band that stays inside the readable measure. No
 * horizontal scrolling: a wide roadmap on a desktop canvas guarantees the right
 * half is never looked at, and on a 390px phone it is simply unusable.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { t, type Locale } from "@/i18n/config";
import {
  CLUSTERS, ENTRIES, ENTRY_BY_SLUG, CLUSTER_BY_SLUG, CLUSTER_OF,
  codexLayers, searchCodex, totalEntries,
} from "@/lib/codex";
import { load, markCodexRead, type Progress } from "@/lib/store";
import type { CodexPathStep } from "@/lib/types";
import { CodexEntryCard } from "./CodexEntryCard";
import { CodexPrimer } from "./CodexPrimer";
import { CodexArchitectureCard } from "./CodexArchitectureCard";
import { ARCHITECTURES } from "@/lib/codex";
import { PageHeroArt } from "./PageHeroArt";

type Mode = "browse" | "path" | "arch";

const COPY = {
  eyebrow: { en: "The Codex", es: "El Códice" },
  title: {
    en: "The vocabulary an AI architect is assumed to already have.",
    es: "El vocabulario que se asume que un arquitecto de IA ya tiene.",
  },
  /** Stating what this is NOT is the most useful sentence on the page. */
  isNot: {
    en: "A reference, not a lesson. Each entry answers three things: what it is, when to reach for it, and what it costs you. The ladder is where these are taught — this is where you look them up.",
    es: "Una referencia, no una lección. Cada entrada responde tres cosas: qué es, cuándo recurrir a ella y qué te cuesta. La escalera es donde se enseñan; aquí es donde las consultas.",
  },
  browse: { en: "Browse", es: "Explorar" },
  path: { en: "Reading path", es: "Ruta de lectura" },
  arch: { en: "Real architectures", es: "Arquitecturas reales" },
  search: { en: "Search the Codex", es: "Buscar en el Códice" },
  searchHint: { en: "Type a term — accents optional", es: "Escribe un término; los acentos son opcionales" },
  noHits: { en: "Nothing matches that yet.", es: "Todavía nada coincide con eso." },
  clusters: { en: "Clusters", es: "Grupos" },
  entries: { en: "entries", es: "entradas" },
  /** Singular. "1 entries" shipped on the deepest band, which has exactly one. */
  entry: { en: "entry", es: "entrada" },
  layer: { en: "Layer", es: "Nivel" },
  layerFirst: { en: "start here, nothing to read first", es: "empieza aquí, nada previo que leer" },
  /** Completed with the band's depth, so it names the exact number of layers. */
  layerNeeds: { en: "each needs a chain of", es: "cada una requiere una cadena de" },
  pathIntro: {
    en: "Read bottom to top. Each band only needs the bands below it, so you can stop anywhere and what you have still holds together.",
    es: "Lee de abajo hacia arriba. Cada banda solo necesita las de abajo, así que puedes detenerte donde quieras y lo aprendido sigue en pie.",
  },
  archIntro: {
    en: "Redrawn from vendor documentation, with the tradeoffs the docs actually state. Every one names the page it came from.",
    es: "Redibujadas desde la documentación de los proveedores, con las compensaciones que los documentos realmente indican. Cada una nombra la página de origen.",
  },
  read: { en: "Mark read", es: "Marcar leído" },
  readDone: { en: "Read", es: "Leído" },
  progress: { en: "read", es: "leídas" },
  empty: {
    en: "The Codex has no entries yet.",
    es: "El Códice todavía no tiene entradas.",
  },
} as const;

/**
 * Group a band's entries by cluster, preserving the authored cluster order.
 *
 * Pure and module-level rather than inline, so it is testable and so it does not
 * rebuild a Map on every render of every band.
 */
function groupByCluster(steps: CodexPathStep[]): [string, CodexPathStep[]][] {
  const groups = new Map<string, CodexPathStep[]>();
  for (const s of steps) {
    const list = groups.get(s.clusterSlug) ?? [];
    list.push(s);
    groups.set(s.clusterSlug, list);
  }
  // CLUSTERS is the editorial order; a Map preserves insertion order, which would
  // instead be "whichever cluster this band happened to hit first".
  const rank = new Map(CLUSTERS.map((c, i) => [c.slug, i]));
  return [...groups.entries()].sort(
    (a, b) => (rank.get(a[0]) ?? 999) - (rank.get(b[0]) ?? 999)
  );
}

export function CodexView({ locale }: { locale: Locale }) {
  const [mode, setMode] = useState<Mode>("browse");
  const [openCluster, setOpenCluster] = useState<string>(CLUSTERS[0]?.slug ?? "");
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProgress(load());
    const on = () => setProgress(load());
    window.addEventListener("levelup:progress", on);
    return () => window.removeEventListener("levelup:progress", on);
  }, []);

  /**
   * Open the cluster the URL's fragment points into, and scroll to the entry.
   *
   * Without this the deep links were broken for 80 of the 92 cross-links the
   * spine renders (87%): `browse` shows only the SELECTED cluster, `openCluster`
   * initialised to the first one, and nothing read `location.hash` — so a lesson
   * offering "Separating retrieval and generation metrics" navigated to
   * `/codex/#e-retrieval-vs-generation-eval` and landed on a chunking page that
   * did not contain that anchor. The link worked; the destination did not.
   *
   * `hashchange` as well as mount, because clicking a prerequisite chip on an
   * entry already in the Codex only changes the fragment — React does not
   * remount, so a mount-only effect would fix the arrival case and leave
   * in-page navigation broken.
   *
   * The scroll is deferred a frame: the cluster has to render before its anchor
   * exists to scroll to.
   */
  useEffect(() => {
    const go = () => {
      const slug = decodeURIComponent(window.location.hash.replace(/^#e-/, ""));
      if (!slug || !ENTRY_BY_SLUG.has(slug)) return;
      const cluster = CLUSTER_OF.get(slug);
      if (!cluster) return;
      setMode("browse");
      setQuery("");            // a live search filter would hide the target
      setOpenCluster(cluster);
      requestAnimationFrame(() => {
        const el = document.getElementById(`e-${slug}`);
        if (!el) return;
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);

  // "/" focuses search — the reference-tool convention. Ignored while the caret
  // is already in a field, so typing a slash into the query still works.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hits = useMemo(() => searchCodex(query), [query]);
  const layers = useMemo(() => codexLayers(), []);
  const termOf = (slug: string) => {
    const e = ENTRY_BY_SLUG.get(slug);
    return e ? t(e.term, locale) : slug;
  };

  const readSet = useMemo(() => new Set(progress?.codexRead ?? []), [progress]);
  const readCount = ENTRIES.filter((e) => readSet.has(e.slug)).length;

  if (ENTRIES.length === 0) {
    return (
      <div className="wrap" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)" }}>
        <p className="prose">{t(COPY.empty, locale)}</p>
      </div>
    );
  }

  return (
    <div className="wrap cx" data-track="ai" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)" }}>
      <div className="hero-band hero-band--slim">
        <PageHeroArt src="/hero/codex.webp" />
        <div className="ws-head" style={{ marginBottom: "var(--s-3)" }}>
          <h1 className="ws-title">
            <span className="code">{t(COPY.eyebrow, locale)}</span>
            {t(COPY.title, locale)}
          </h1>
        </div>
        <p className="prose cx-isnot">{t(COPY.isNot, locale)}</p>
        <p className="res-stats">
          {totalEntries()} {t(COPY.entries, locale)} · {ARCHITECTURES.length} {t(COPY.arch, locale).toLowerCase()}
          {readCount > 0 && <> · {readCount} {t(COPY.progress, locale)}</>}
        </p>
      </div>

      {/* Search sits ABOVE the mode switch: on a reference, "I know the word I
          want" is the most common arrival, and it should not require a mode. */}
      <div className="cx-search">
        <label className="eyebrow" htmlFor="cx-q">{t(COPY.search, locale)}</label>
        <input
          id="cx-q"
          ref={searchRef}
          type="search"
          className="cx-search-input"
          value={query}
          placeholder={t(COPY.searchHint, locale)}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.trim().length >= 2 ? (
        <div className="cx-results">
          {hits.length === 0 ? (
            <p className="prose">{t(COPY.noHits, locale)}</p>
          ) : (
            <>
              <p className="eyebrow">{hits.length} {t(COPY.entries, locale)}</p>
              {hits.map(({ entry, clusterSlug }) => (
                <div key={entry.slug} className="cx-hit">
                  <p className="eyebrow cx-hit-cluster">
                    {t(CLUSTER_BY_SLUG.get(clusterSlug)?.title ?? { en: "", es: "" }, locale)}
                  </p>
                  <CodexEntryCard locale={locale} entry={entry} resolveTerm={termOf} />
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <>
          <div className="gc-trackseg cx-modes" role="tablist" aria-label={t(COPY.eyebrow, locale)}>
            {(["browse", "path", "arch"] as Mode[]).map((mk) => (
              <button
                key={mk}
                role="tab"
                aria-selected={mode === mk}
                className={mode === mk ? "active" : ""}
                onClick={() => setMode(mk)}
              >
                {t(COPY[mk], locale)}
              </button>
            ))}
          </div>

          {mode === "browse" && (
            <div className="ws-layout">
              {/* The cluster switcher, for phones and tablets.
                  `.ws-sidebar` is `display: none` below 1051px (09-study-kit.css),
                  which is right for the Learn hub — its sidebar duplicates
                  controls that exist in the page body. Here it was the ONLY way to
                  change cluster, so at 390px, 768px and 1024px a learner could
                  reach 12 of 107 entries while the page advertised 107. A native
                  <select> rather than a chip row: eleven clusters is too many for a
                  row that fits, and a native control gets the platform's own
                  picker, keyboard handling and accessible name for free. */}
              <label className="cx-clusterpick">
                <span className="eyebrow">{t(COPY.clusters, locale)}</span>
                <select
                  value={openCluster}
                  onChange={(e) => setOpenCluster(e.target.value)}
                >
                  {CLUSTERS.map((c) => {
                    const done = c.entries.filter((e) => readSet.has(e.slug)).length;
                    return (
                      <option key={c.slug} value={c.slug}>
                        {t(c.title, locale)} ({done}/{c.entries.length})
                      </option>
                    );
                  })}
                </select>
              </label>

              <aside className="ws-sidebar">
                <div className="sb-title">{t(COPY.clusters, locale)}</div>
                {CLUSTERS.map((c) => {
                  const done = c.entries.filter((e) => readSet.has(e.slug)).length;
                  return (
                    <button
                      key={c.slug}
                      className={`sb-domain ${openCluster === c.slug ? "active" : ""}`}
                      onClick={() => setOpenCluster(c.slug)}
                    >
                      <span className="cx-sb-name">{t(c.title, locale)}</span>
                      <span className="sb-weight mono">{done}/{c.entries.length}</span>
                    </button>
                  );
                })}
              </aside>

              <div>
                {CLUSTERS.filter((c) => c.slug === openCluster).map((c) => (
                  <section key={c.slug} className="cx-cluster">
                    <h2 className="cx-cluster-title">{t(c.title, locale)}</h2>
                    <p className="cx-cluster-tagline">{t(c.tagline, locale)}</p>
                    {/* The primer, between the tagline and the entries. This is the
                        only place in the app where content is deliberately read
                        top-down before anything else: a reader who does not yet own
                        the cluster's vocabulary cannot use the entry list, and the
                        tagline alone was one line of orientation for up to 18
                        siblings. Optional in the render because the TYPE is optional
                        (the schema stays additive); merge-codex.cjs is what
                        guarantees every shipped cluster has one. */}
                    {c.primer && (
                      <CodexPrimer locale={locale} primer={c.primer} resolveTerm={termOf} />
                    )}
                    <div className="cx-entries">
                      {c.entries.map((e) => (
                        <div key={e.slug} className="cx-entry-wrap">
                          <CodexEntryCard locale={locale} entry={e} resolveTerm={termOf} />
                          <button
                            className="cx-readbtn"
                            data-read={readSet.has(e.slug) ? "true" : "false"}
                            onClick={() => markCodexRead(e.slug)}
                          >
                            {readSet.has(e.slug) ? `✓ ${t(COPY.readDone, locale)}` : t(COPY.read, locale)}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}

          {mode === "path" && (
            <section className="cx-path">
              <p className="prose cx-path-intro">{t(COPY.pathIntro, locale)}</p>
              {/* Bottom-up: layer 0 (nothing required) renders LAST so it sits at
                  the foot of the spine, which is where "start here" belongs in a
                  climb metaphor the rest of the app already uses. */}
              <ol className="cx-spine">
                {[...layers.entries()].reverse().map(([depth, steps]) => (
                  <li key={depth} className="cx-band" data-depth={depth}>
                    {/* The band label says WHAT IS TRUE of this band, not a
                        constant. Every band used to read "Needs everything below",
                        which is the same words four times and tells the reader
                        nothing about where they are. */}
                    <div className="cx-band-head">
                      <span className="cx-band-n mono">{t(COPY.layer, locale)} {depth}</span>
                      <span className="cx-band-note">
                        {(() => {
                          const n = `${steps.length} ${t(steps.length === 1 ? COPY.entry : COPY.entries, locale)}`;
                          return depth === 0
                            ? `${n} · ${t(COPY.layerFirst, locale)}`
                            : `${n} · ${t(COPY.layerNeeds, locale)} ${depth}`;
                        })()}
                      </span>
                    </div>
                    {/* Grouped by cluster inside the band.
                        Measured on the shipped data: layer 0 holds 49 entries and
                        layer 1 holds 37, because only half the entries declare a
                        prerequisite. A 49-node band is a wall, not a route — and
                        repeating the cluster name on every node made it worse by
                        adding a line of chrome per node. Depth stays the vertical
                        position, so the DAG still reads bottom-up; inside a band,
                        the cluster is the thing that makes it scannable. */}
                    {groupByCluster(steps).map(([clusterSlug, group]) => (
                      <div key={clusterSlug} className="cx-band-group">
                        <p className="cx-band-cluster mono">
                          {t(CLUSTER_BY_SLUG.get(clusterSlug)?.title ?? { en: "", es: "" }, locale)}
                          <span className="cx-band-count">{group.length}</span>
                        </p>
                        <div className="cx-band-nodes">
                          {group.map((s) => {
                            const e = ENTRY_BY_SLUG.get(s.entrySlug);
                            if (!e) return null;
                            return (
                              <a
                                key={s.entrySlug}
                                href={`#e-${s.entrySlug}`}
                                className="cx-node"
                                data-read={readSet.has(s.entrySlug) ? "true" : "false"}
                                onClick={() => { setMode("browse"); setOpenCluster(s.clusterSlug); }}
                              >
                                <span className="cx-node-term">{t(e.term, locale)}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {mode === "arch" && (
            <section className="cx-archs">
              <p className="prose cx-path-intro">{t(COPY.archIntro, locale)}</p>
              {ARCHITECTURES.map((a) => (
                <CodexArchitectureCard key={a.slug} locale={locale} arch={a} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default CodexView;
