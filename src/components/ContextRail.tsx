"use client";
// Right column of the lesson workbench: a swappable context rail. It shows one
// tab per enriched field the concept actually has (Takeaways / Keywords / Code /
// Example / Architecture) — feature-detected, so an unenriched concept simply
// shows fewer tabs (or just Takeaways). On mobile the rail becomes a chip row
// above its panel (CSS). Keyboard: roving arrow-key tablist.
import { useState, useMemo } from "react";
import { t, type Locale } from "@/i18n/config";
import { m, type MessageKey } from "@/i18n/messages";
import { Schematic } from "./Schematic";
import { CodeView } from "./lesson/CodeView";
import type { ConceptLesson } from "@/lib/types";

type TabKey = "takeaways" | "keywords" | "code" | "example" | "architecture";

export function ContextRail({
  locale, concept, track,
}: {
  locale: Locale; concept: ConceptLesson; track: "general" | "ai";
}) {
  // Which tabs exist for this concept (order is stable).
  const tabs = useMemo<TabKey[]>(() => {
    const ts: TabKey[] = [];
    if (concept.keyPoints?.length) ts.push("takeaways");
    if (concept.keywords?.length) ts.push("keywords");
    if (concept.code) ts.push("code");
    if (concept.example) ts.push("example");
    if (concept.architecture && concept.architecture.kind !== "none") ts.push("architecture");
    return ts;
  }, [concept]);

  const [active, setActive] = useState<TabKey>(tabs[0] ?? "takeaways");
  if (!tabs.length) return null;
  const cur = tabs.includes(active) ? active : tabs[0];
  const labelKey: Record<TabKey, MessageKey> = {
    takeaways: "rail.takeaways", keywords: "rail.keywords", code: "rail.code",
    example: "rail.example", architecture: "rail.architecture",
  };

  return (
    <aside className="context-rail" data-track={track} aria-label={m("rail.context", locale)}>
      <div className="rail-tabs" role="tablist" aria-label={m("rail.context", locale)}>
        {tabs.map((tk) => (
          <button key={tk} role="tab" aria-selected={cur === tk}
            className="rail-tab" data-active={cur === tk} onClick={() => setActive(tk)}>
            {m(labelKey[tk], locale)}
          </button>
        ))}
      </div>
      <div className="rail-panel" role="tabpanel">
        {cur === "takeaways" && (
          <ul className="lesson-keypoints">
            {concept.keyPoints.map((kp, i) => <li key={i}>{t(kp, locale)}</li>)}
          </ul>
        )}
        {cur === "keywords" && (
          <dl className="rail-keywords">
            {concept.keywords!.map((k, i) => (
              <div key={i} className="rail-keyword">
                <dt className="mono">{t(k.term, locale)}</dt>
                <dd className="dim">{t(k.def, locale)}</dd>
              </div>
            ))}
          </dl>
        )}
        {cur === "code" && (
          <CodeView code={concept.code!} locale={locale} track={track} />
        )}
        {cur === "example" && (
          <div className="rail-example">
            <p className="prose"><strong>{t(concept.example!.scenario, locale)}</strong></p>
            <p className="eyebrow" style={{ marginTop: "var(--s-3)" }}>{m("lesson.walkthrough", locale)}</p>
            <p className="prose">{t(concept.example!.walkthrough, locale)}</p>
          </div>
        )}
        {cur === "architecture" && (
          <Schematic spec={concept.architecture!} locale={locale} />
        )}
      </div>
    </aside>
  );
}

export default ContextRail;
