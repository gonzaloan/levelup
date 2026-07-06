"use client";
// The pixel-mode Curriculum: a Mario-3 "choose your world" overworld, faithful
// to get-certified's pixel picker. A dawn sky with a pixel sun, drifting pixel
// clouds and a parallax mountain band; each of the six domains is a "continent"
// standing on a tiled island with its own landmark sprite; clicking a continent
// opens its level path (L3→L7) as a winding row of pixel nodes. All sprites are
// crisp authored SVG from the ported engine.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { AXIS_BY_ID, LEVELS, type Level } from "@/lib/axes";
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

  // Game-style "level start" curtain: play the SMB3 title wipe, then navigate.
  const [curtain, setCurtain] = useState<{ href: string; world: string; role: string } | null>(null);
  function openLesson(href: string, world: number, level: string, role: string) {
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { router.push(href); return; }
    const lvNum = level.replace("L", "");
    setCurtain({ href, world: `WORLD ${world}-${lvNum}`, role });
    setTimeout(() => router.push(href), 640);
  }

  return (
    <div className="pixel-picker">
      {curtain && (
        <div className="level-start" data-show="true" role="dialog" aria-label={m("pixel.levelStart", locale)}>
          <div className="ls-card">
            <div className="ls-world">{curtain.world}</div>
            <div className="ls-role">{curtain.role}</div>
          </div>
        </div>
      )}
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
            worldIndex={ORDERED_DOMAINS.findIndex((d) => d.id === openWorld) + 1}
            onBack={() => setOpenWorld(null)}
            onOpenLesson={(href, level, role) => openLesson(href, ORDERED_DOMAINS.findIndex((d) => d.id === openWorld) + 1, level, role)} />
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

// What each level means — shown on the node's focus/tap tooltip so the owner
// (and every learner) finally understands L3→L7.
const LEVEL_INFO: Record<Level, { name: { en: string; es: string }; what: { en: string; es: string } }> = {
  L3: { name: { en: "Developing", es: "En desarrollo" }, what: { en: "Build the foundations — one machine, one service.", es: "Construye las bases — una máquina, un servicio." } },
  L4: { name: { en: "Senior", es: "Senior" }, what: { en: "Own your area's design and ship reliably.", es: "Dueño del diseño de tu área; entrega con fiabilidad." } },
  L5: { name: { en: "Staff Threshold", es: "Umbral Staff" }, what: { en: "Set a team's technical approach.", es: "Fija el enfoque técnico de un equipo." } },
  L6: { name: { en: "Staff", es: "Staff" }, what: { en: "Direct multiple teams over quarters.", es: "Dirige varios equipos durante trimestres." } },
  L7: { name: { en: "Principal", es: "Principal" }, what: { en: "Shape org- and industry-wide direction.", es: "Moldea la dirección de la organización e industria." } },
};

// Node coordinates on a winding Mario trail (percent of a 100×64 viewBox).
// Desktop: an S-curve rising left→right; mobile: a vertical serpentine.
const NODE_XY_D = [{ x: 10, y: 74 }, { x: 30, y: 40 }, { x: 50, y: 66 }, { x: 70, y: 30 }, { x: 88, y: 56 }];
const CASTLE_XY_D = { x: 97, y: 40 };
const NODE_XY_M = [{ x: 26, y: 8 }, { x: 70, y: 26 }, { x: 30, y: 44 }, { x: 68, y: 62 }, { x: 30, y: 80 }];
const CASTLE_XY_M = { x: 70, y: 94 };

// A domain's level path: L3→L7 as a real connected overworld map with a hero
// avatar on the current node, a chunky winding trail whose segments light as
// levels clear, and a castle boss at the summit. Keyboard: ←/→ move, Enter opens.
function WorldPath({ locale, domainId, progress, onBack, onOpenLesson }: {
  locale: Locale; domainId: string; progress: Progress | null; worldIndex: number;
  onBack: () => void; onOpenLesson: (href: string, level: string, role: string) => void;
}) {
  const dom = ORDERED_DOMAINS.find((d) => d.id === domainId)!;
  const axis = AXIS_BY_ID[dom.axisId];
  const w = WORLD[domainId];
  const cleared = new Set(progress?.checkpointsCleared ?? []);
  const levelsWith = LEVELS.filter((lv) => dom.levels.find((l) => l.level === lv)?.concepts.length);

  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setMobile(mq.matches); on();
    mq.addEventListener?.("change", on); return () => mq.removeEventListener?.("change", on);
  }, []);
  const NODE_XY = mobile ? NODE_XY_M : NODE_XY_D;
  const CASTLE_XY = mobile ? CASTLE_XY_M : CASTLE_XY_D;

  const stateOf = (i: number): "done" | "current" | "open" => {
    const chk = checkpointsAfter(domainId, levelsWith[i]);
    if (chk && cleared.has(chk.id)) return "done";
    // current = first not-done
    const firstUn = levelsWith.findIndex((lv) => { const c = checkpointsAfter(domainId, lv); return !c || !cleared.has(c.id); });
    return i === firstUn ? "current" : "open";
  };
  const currentIndex = Math.max(0, levelsWith.findIndex((lv) => { const c = checkpointsAfter(domainId, lv); return !c || !cleared.has(c.id); }));

  // keyboard roving focus across nodes
  const [focusIdx, setFocusIdx] = useState(currentIndex);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); const n = Math.min(levelsWith.length - 1, focusIdx + 1); setFocusIdx(n); nodeRefs.current[n]?.focus(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); const n = Math.max(0, focusIdx - 1); setFocusIdx(n); nodeRefs.current[n]?.focus(); }
  }

  // Trail points in viewBox units (100×64), nodes then castle.
  const pts = [...NODE_XY.map((p) => ({ x: p.x / 100 * 100, y: p.y / 100 * 64 })), { x: CASTLE_XY.x / 100 * 100, y: CASTLE_XY.y / 100 * 64 }];
  const segDone = (i: number) => stateOf(i) === "done"; // segment i (node i→i+1) lit when node i done

  return (
    <div className="pp-world mw" data-mobile={mobile ? "true" : "false"} style={{ ["--accent" as string]: w.accent, ["--accent-deep" as string]: w.deep }}>
      <div className="pp-world-head">
        <button className="pixel-btn pp-back" onClick={onBack} aria-label={m("pixel.allWorlds", locale)}>← {m("pixel.allWorlds", locale)}</button>
        <span className="pp-world-title">{t(axis.name, locale)}</span>
      </div>

      <div className="mw-map" role="group" aria-label={t(axis.name, locale)} onKeyDown={onKey}
        style={{ backgroundImage: groundUrl(w.ground) }}>
        {/* winding trail */}
        <svg className="mw-trail" viewBox="0 0 100 64" preserveAspectRatio="none" aria-hidden="true">
          {pts.slice(0, -1).map((p, i) => {
            const q = pts[i + 1];
            return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
              className="mw-seg" data-lit={segDone(i) ? "true" : "false"} strokeLinecap="round" />;
          })}
        </svg>
        {/* scenery */}
        <span className="mw-scene mw-sun"><PixelSprite name="sun" /></span>
        <span className="mw-scene mw-tree1"><PixelSprite name="tree" /></span>

        {/* nodes */}
        {levelsWith.map((lv, i) => {
          const st = stateOf(i);
          const href = `/${locale}/lesson/${domainId}-${lv.toLowerCase()}`;
          const info = LEVEL_INFO[lv];
          return (
            <button key={lv} ref={(el) => { nodeRefs.current[i] = el; }}
              className="mw-node" data-state={st} tabIndex={i === focusIdx ? 0 : -1}
              style={{ left: `${NODE_XY[i].x}%`, top: `${NODE_XY[i].y}%` }}
              onClick={() => onOpenLesson(href, lv, t(axis.name, locale))} onFocus={() => setFocusIdx(i)}
              aria-label={`${lv} · ${t(info.name, locale)} — ${t(info.what, locale)}${st === "current" ? ` (${m("pixel.current", locale)})` : st === "done" ? ` (${m("pixel.cleared", locale)})` : ""}`}>
              <PixelNode state={st} />
              <span className="mw-node-code" aria-hidden="true">{lv}</span>
              {st === "current" && <span className="mw-avatar" aria-hidden="true"><PixelSprite name="hero" /></span>}
              {st === "done" && <span className="mw-flag" aria-hidden="true"><PixelSprite name="flag" /></span>}
              {/* tooltip: what this level means */}
              <span className="mw-tip" aria-hidden="true">
                <b>{lv} · {t(info.name, locale)}</b>
                <span>{t(info.what, locale)}</span>
              </span>
            </button>
          );
        })}

        {/* castle boss at the summit */}
        <span className="mw-castle" style={{ left: `${CASTLE_XY.x}%`, top: `${CASTLE_XY.y}%` }} aria-hidden="true">
          <PixelSprite name={w.sprite} />
        </span>
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
