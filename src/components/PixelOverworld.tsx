"use client";
// The pixel-mode Curriculum: a Mario-3 "choose your world" overworld, faithful
// to get-certified's pixel picker. A dawn sky with a pixel sun, drifting pixel
// clouds and a parallax mountain band; each of the six domains is a "continent"
// standing on a tiled island with its own landmark sprite; clicking a continent
// opens its level path (L3→L7) as a winding row of pixel nodes. All sprites are
// crisp authored SVG from the ported engine.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXIS_BY_ID, LEVELS } from "@/lib/axes";
import { ORDERED_DOMAINS, checkpointsAfter, totalConcepts, CHECKPOINTS } from "@/lib/curriculum";
import { load, type Progress } from "@/lib/store";
import { PixelSprite, PixelNode } from "./PixelSprite";
import { sprite as pxSprite } from "@/lib/pixels";

// Map each domain to a landmark sprite + accent color (DawnBringer).
const WORLD: Record<string, { sprite: string; ground: string; accent: string; deep: string }> = {
  "technical-depth":       { sprite: "towerAIF",    ground: "grass", accent: "#6dc2ca", deep: "#30346d" },
  "systems-architecture":  { sprite: "fortressCLF", ground: "sand",  accent: "#597dce", deep: "#30346d" },
  "execution-delivery":    { sprite: "castle",      ground: "grass", accent: "#6daa2c", deep: "#346524" },
  "direction-influence":   { sprite: "signpost",    ground: "dirt",  accent: "#dad45e", deep: "#854c30" },
  "leveling-scope":        { sprite: "tree",        ground: "grass", accent: "#d2aa99", deep: "#442434" },
  "ai-engineering":        { sprite: "keepCCA",     ground: "dirt",  accent: "#d98a5b", deep: "#3a2b6b" },
};

export function PixelOverworld({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [openWorld, setOpenWorld] = useState<string | null>(null);
  useEffect(() => {
    setProgress(load());
    const on = () => setProgress(load());
    window.addEventListener("levelup:progress", on);
    return () => window.removeEventListener("levelup:progress", on);
  }, []);

  const cleared = new Set(progress?.checkpointsCleared ?? []);
  const stars = cleared.size;
  const totalStars = CHECKPOINTS.length;

  return (
    <div className="pixel-picker">
      {/* scenery */}
      <div className="pp-scenery" aria-hidden="true">
        <div className="pp-sun"><PixelSprite name="sun" /></div>
        <div className="pp-cloud pp-c1"><PixelSprite name="cloud" /></div>
        <div className="pp-cloud pp-c2"><PixelSprite name="cloud" /></div>
        <div className="pp-cloud pp-c3"><PixelSprite name="cloud" /></div>
        <div className="pp-mountains"><PixelSprite name="mountainsFar" /></div>
      </div>

      <div className="pp-inner">
        {/* HUD */}
        <div className="pp-hud">
          <span className="pp-hud-badge">★ {stars}/{totalStars}</span>
          <span className="pp-hud-label">{totalConcepts()} {m("path.concepts", locale)}</span>
        </div>

        {openWorld ? (
          <WorldPath locale={locale} domainId={openWorld} progress={progress}
            onBack={() => setOpenWorld(null)} onOpenLesson={(href) => router.push(href)} />
        ) : (
          <>
            <h1 className="pp-title">{m("pixel.chooseWorld", locale)}</h1>
            <p className="pp-sub">{m("pixel.chooseWorldSub", locale)}</p>
            <div className="pp-continents">
              {ORDERED_DOMAINS.map((dom) => {
                const w = WORLD[dom.id];
                const axis = AXIS_BY_ID[dom.axisId];
                const domCheckpoints = LEVELS.map((lv) => checkpointsAfter(dom.id, lv)).filter(Boolean);
                const clearedN = domCheckpoints.filter((c) => cleared.has(c!.id)).length;
                const pct = domCheckpoints.length ? Math.round((clearedN / domCheckpoints.length) * 100) : 0;
                return (
                  <button key={dom.id} className="pp-continent"
                    style={{ ["--accent" as string]: w.accent, ["--accent-deep" as string]: w.deep }}
                    onClick={() => setOpenWorld(dom.id)}>
                    <span className="pp-flag">{t(axis.short, locale).toUpperCase()}</span>
                    <span className="pp-island">
                      <span className="pp-island-ground" style={{ backgroundImage: groundUrl(w.ground) }} />
                      <span className="pp-emblem"><PixelSprite name={w.sprite} /></span>
                    </span>
                    <span className="pp-continent-name">{t(axis.name, locale)}</span>
                    <span className="pp-continent-stat">{clearedN}/{domCheckpoints.length} ★ · {pct}%</span>
                    <span className="pp-continent-cta">{clearedN > 0 ? m("pixel.continue", locale) : m("pixel.enter", locale)} →</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// A domain's level path: L3→L7 as pixel nodes on a winding trail, plus links.
function WorldPath({ locale, domainId, progress, onBack, onOpenLesson }: {
  locale: Locale; domainId: string; progress: Progress | null; onBack: () => void; onOpenLesson: (href: string) => void;
}) {
  const dom = ORDERED_DOMAINS.find((d) => d.id === domainId)!;
  const axis = AXIS_BY_ID[dom.axisId];
  const w = WORLD[domainId];
  const cleared = new Set(progress?.checkpointsCleared ?? []);
  const levelsWith = LEVELS.filter((lv) => dom.levels.find((l) => l.level === lv)?.concepts.length);

  // determine node state per level: done if checkpoint cleared; current = first
  // not-done; else open (we don't hard-lock, but style shows the frontier).
  const firstUncleared = levelsWith.find((lv) => {
    const chk = checkpointsAfter(domainId, lv);
    return !chk || !cleared.has(chk.id);
  });

  return (
    <div className="pp-world" style={{ ["--accent" as string]: w.accent, ["--accent-deep" as string]: w.deep }}>
      <div className="pp-world-head">
        <button className="pixel-btn pp-back" onClick={onBack}>← {m("pixel.allWorlds", locale)}</button>
        <span className="pp-world-title">{t(axis.name, locale)}</span>
      </div>
      <div className="pp-trail">
        {levelsWith.map((lv, i) => {
          const chk = checkpointsAfter(domainId, lv);
          const done = chk && cleared.has(chk.id);
          const state = done ? "done" : lv === firstUncleared ? "current" : "open";
          const href = `/${locale}/lesson/${domainId}-${lv.toLowerCase()}`;
          return (
            <div key={lv} className="pp-trail-cell" style={{ ["--i" as string]: String(i) }}>
              {i > 0 && <span className="pp-trail-link" aria-hidden="true"><PixelSprite name="path" /></span>}
              <button className="pp-node" data-state={state} onClick={() => onOpenLesson(href)}
                title={`${lv} · ${t(axis.name, locale)}`}>
                <PixelNode state={state} />
                <span className="pp-node-num">{lv}</span>
              </button>
            </div>
          );
        })}
        {/* the world's landmark at the summit */}
        <div className="pp-trail-cell">
          <span className="pp-trail-link" aria-hidden="true"><PixelSprite name="path" /></span>
          <span className="pp-summit"><PixelSprite name={w.sprite} /></span>
        </div>
      </div>
      <p className="pp-world-hint">{m("pixel.tapNode", locale)}</p>
    </div>
  );
}

// data-URI a tiled ground sprite for the island base.
function groundUrl(name: string): string {
  const svg = pxSprite(name);
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default PixelOverworld;
