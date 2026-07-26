"use client";
// The full reading list, filterable and GROUPED.
//
// The first version rendered all 116 resources as one flat column — a 16,000px
// page nobody scrolls. Two fixes, both about scannability rather than styling:
//   • Group by domain, with each group collapsible and a count in its header, so
//     the page opens as a table of contents rather than a wall.
//   • Open only the first group by default. A learner arriving from a lesson
//     wants their own domain, and everything else should be one click away, not
//     one thousand pixels away.
//
// Filtering stays client-side over a static array. The library is hundreds of
// entries, not millions; anything else would be architecture for its own sake.
import { useMemo, useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXES, LEVELS, AXIS_COLOR, type Level, type AxisId } from "@/lib/axes";
import { RESOURCES, KIND_LABEL, KIND_ORDER, resourceStats, type ResourceKind, type Resource } from "@/lib/resources";
import { ResourceList } from "./ResourceList";
import { PageHeroArt } from "./PageHeroArt";

type KindFilter = ResourceKind | "all";
type DomainFilter = string | "all";
type LevelFilter = Level | "all";

export function ResourceBrowser({ locale }: { locale: Locale }) {
  const [kind, setKind] = useState<KindFilter>("all");
  const [domain, setDomain] = useState<DomainFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  // Which domain groups are expanded. Seeded below with just the first one.
  const [open, setOpen] = useState<Set<string> | null>(null);

  // Only offer chips for values that exist in the data, so the UI never
  // advertises an empty category.
  const kinds = useMemo(() => KIND_ORDER.filter((k) => RESOURCES.some((r) => r.kind === k)), []);
  const domains = useMemo(() => AXES.filter((a) => RESOURCES.some((r) => r.domainId === a.key)), []);
  const stats = useMemo(() => resourceStats(), []);

  const filtered = useMemo(
    () =>
      RESOURCES.filter(
        (r) =>
          (kind === "all" || r.kind === kind) &&
          (domain === "all" || r.domainId === domain) &&
          (level === "all" || r.levels.includes(level))
      ),
    [kind, domain, level]
  );

  // Grouped in axis order, essentials first inside each group.
  const groups = useMemo(() => {
    const byDomain = new Map<string, Resource[]>();
    for (const r of filtered) {
      const list = byDomain.get(r.domainId) ?? [];
      list.push(r);
      byDomain.set(r.domainId, list);
    }
    return AXES.filter((a) => byDomain.has(a.key)).map((a) => ({
      axis: a,
      resources: (byDomain.get(a.key) ?? []).sort(
        (x, y) => Number(!!y.essential) - Number(!!x.essential) || x.title.localeCompare(y.title)
      ),
    }));
  }, [filtered]);

  // Default: first group open. Recomputed only while the learner hasn't touched
  // a toggle, so filtering doesn't fight their expand/collapse choices.
  const openSet = open ?? new Set(groups.length ? [groups[0].axis.key] : []);
  const toggle = (key: string) => {
    const next = new Set(openSet);
    if (next.has(key)) next.delete(key); else next.add(key);
    setOpen(next);
  };

  return (
    <div className="wrap" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)" }}>
      <div className="hero-band hero-band--slim">
        <PageHeroArt src="/hero/reading.webp" />
        <div className="ws-head" style={{ marginBottom: "var(--s-3)" }}>
          <h1 className="ws-title">
            <span className="code">{m("res.heading", locale)}</span>
            {m("res.title", locale)}
          </h1>
        </div>
        <p className="prose" style={{ maxWidth: "62ch" }}>{m("res.intro", locale)}</p>
        <p className="res-stats">
          {stats.total} {m("res.verifiedNote", locale)} · {stats.essential} {m("res.essentialCount", locale)}
        </p>
      </div>

      <div className="resfilters">
        <FilterRow label={m("res.filterKind", locale)}>
          <Chip active={kind === "all"} onClick={() => setKind("all")}>{m("res.all", locale)}</Chip>
          {kinds.map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{t(KIND_LABEL[k], locale)}</Chip>
          ))}
        </FilterRow>
        <FilterRow label={m("res.filterDomain", locale)}>
          <Chip active={domain === "all"} onClick={() => setDomain("all")}>{m("res.all", locale)}</Chip>
          {domains.map((a) => (
            <Chip key={a.key} active={domain === a.key} onClick={() => setDomain(a.key)} dot={AXIS_COLOR[a.id]}>
              {t(a.short, locale)}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label={m("res.filterLevel", locale)}>
          <Chip active={level === "all"} onClick={() => setLevel("all")}>{m("res.all", locale)}</Chip>
          {LEVELS.map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)}>{l}</Chip>
          ))}
        </FilterRow>
      </div>

      <p className="eyebrow res-count">
        {m("res.count", locale).replace("{n}", String(filtered.length))}
      </p>

      {filtered.length === 0 ? (
        <p className="prose">{m("res.none", locale)}</p>
      ) : (
        <div className="resgroups">
          {groups.map(({ axis, resources }) => {
            const isOpen = openSet.has(axis.key);
            return (
              <section key={axis.key} className="resgroup">
                <h2 className="resgroup-h">
                  <button
                    type="button"
                    className="resgroup-toggle"
                    aria-expanded={isOpen}
                    onClick={() => toggle(axis.key)}
                  >
                    <span className="resgroup-dot" aria-hidden="true" style={{ background: AXIS_COLOR[axis.id as AxisId] }} />
                    <span className="resgroup-name">{t(axis.name, locale)}</span>
                    <span className="resgroup-count">{resources.length}</span>
                    <span className="resgroup-chev" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
                  </button>
                </h2>
                {/* heading={null}: the group header above already names this section. */}
                {isOpen && <ResourceList locale={locale} resources={resources} heading={null} compact />}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="resfilter-row">
      <span className="eyebrow resfilter-label">{label}</span>
      <div className="resfilter-chips" role="group" aria-label={label}>{children}</div>
    </div>
  );
}

function Chip({
  active, onClick, children, dot,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; dot?: string;
}) {
  return (
    <button type="button" className="reschip" aria-pressed={active} onClick={onClick}>
      {dot && <span className="reschip-dot" aria-hidden="true" style={{ background: dot }} />}
      {children}
    </button>
  );
}
