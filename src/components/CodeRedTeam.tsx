"use client";
// The 30% Gauntlet — a playable, non-fakeable AI code red-team. The learner
// reads model-written code, CLICKS the exact offending lines, and CLASSIFIES
// each against the OWASP LLM Top 10 (2025). Auto-graded against a hidden
// line-keyed rubric — no honor system, no textarea to bluff into. The reward is
// the after-action diff: what you missed, the exploit each flaw enables, the fix.
//
// This is the flagship feature: it fills the AI track, replaces the weak
// honor-system Field Work with real proof-of-work, and is a genuinely novel
// assessment format for a learning tool.
import { useMemo, useState } from "react";
import { fireReward } from "./Reward";
import { load, recordGauntlet } from "@/lib/store";
import { t, type Locale } from "@/i18n/config";
import {
  GAUNTLET,
  GAUNTLET_TOTAL_WEIGHT,
  FLAW_CLASSES,
  FLAW_CLASS_BY_ID,
  type FlawClass,
} from "@/content/data/gauntlet";

type Phase = "hunt" | "debrief";
// A learner mark: a line they flagged + the class they assigned it.
type Mark = { line: number; class: FlawClass };

const CLEAR = 0.8;

export function CodeRedTeam({ locale }: { locale: Locale }) {
  const [phase, setPhase] = useState<Phase>("hunt");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [active, setActive] = useState<number | null>(null); // line awaiting a class pick
  const [result, setResult] = useState<{ score: number; hit: number; missed: number; fp: number; isFirst: boolean } | null>(null);

  const flawLines = useMemo(() => GAUNTLET.lines.filter((l) => l.flaw), []);
  const markByLine = useMemo(() => new Map(marks.map((m) => [m.line, m])), [marks]);

  function toggleLine(n: number) {
    if (phase !== "hunt") return;
    if (markByLine.has(n)) {
      setMarks((ms) => ms.filter((m) => m.line !== n));
      setActive(null);
    } else {
      setActive(n); // open the class picker for this line
    }
  }

  function assignClass(n: number, cls: FlawClass) {
    setMarks((ms) => [...ms.filter((m) => m.line !== n), { line: n, class: cls }]);
    setActive(null);
  }

  function grade() {
    let got = 0;
    let hit = 0;
    let fp = 0;
    for (const mk of marks) {
      const line = GAUNTLET.lines.find((l) => l.n === mk.line);
      const flaw = line?.flaw;
      if (!flaw) {
        fp += 1; // false positive: flagged a clean line
        continue;
      }
      hit += 1;
      // Full weight for correct class, partial (60%) for locating but mis-classifying.
      got += mk.class === flaw.class ? flaw.weight : flaw.weight * 0.6;
    }
    // A false positive costs a small flat penalty (can't drive below 0).
    const penalty = fp * 1;
    const raw = Math.max(0, got - penalty);
    const score = GAUNTLET_TOTAL_WEIGHT ? Math.min(1, raw / GAUNTLET_TOTAL_WEIGHT) : 0;
    const missed = flawLines.length - hit;
    const isFirst = !load().gauntlets[GAUNTLET.id];
    setResult({ score, hit, missed, fp, isFirst });
    setPhase("debrief");
    const outcome = recordGauntlet(GAUNTLET.id, score);
    fireReward({
      kind: "gauntlet",
      track: "ai",
      signal: outcome.newlyCleared ? 40 : 0,
      title: t({ en: "THE 30% GAUNTLET", es: "EL DESAFÍO DEL 30%" }, locale),
      body:
        score >= CLEAR
          ? t({ en: "You caught the flaws a model can't judge for you. That's the 30% the level lives in.", es: "Encontraste los defectos que un modelo no puede juzgar por ti. Ese es el 30% donde vive el nivel." }, locale)
          : t({ en: "Some flaws shipped past you — the debrief shows each exploit. That gap is exactly the training target.", es: "Algunos defectos se te pasaron — el debrief muestra cada exploit. Esa brecha es justo el objetivo de entrenamiento." }, locale),
    });
  }

  function reset() {
    setMarks([]);
    setActive(null);
    setResult(null);
    setPhase("hunt");
  }

  const pct = result ? Math.round(result.score * 100) : 0;

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }} data-track="ai">
      <div>
        <p className="eyebrow" style={{ color: "var(--ai-signal)" }}>
          {t({ en: "Boss · Cross the Threshold", es: "Jefe · Cruza el Umbral" }, locale)}
        </p>
        <h2 className="display" style={{ fontSize: "var(--t-h2)" }}>{t(GAUNTLET.title, locale)}</h2>
        <p className="prose">{t(GAUNTLET.brief, locale)}</p>
      </div>

      {/* HUD */}
      <div style={{ display: "flex", gap: "var(--s-4)", flexWrap: "wrap", alignItems: "center" }}>
        <span className="mono" style={{ fontSize: "var(--t-xs)", color: "var(--text-3)", letterSpacing: "0.08em" }}>
          {GAUNTLET.lang}
        </span>
        <span className="mono" style={{ fontSize: "var(--t-xs)", color: "var(--ai-accent)" }}>
          {t({ en: "flagged", es: "marcadas" }, locale)}: {marks.length}
        </span>
        {phase === "debrief" && result && (
          <span className="mono" style={{ fontSize: "var(--t-xs)", color: pct >= 80 ? "var(--ok)" : "var(--warn)" }}>
            {t({ en: "found", es: "hallados" }, locale)} {result.hit}/{flawLines.length}
            {result.fp > 0 ? ` · ${result.fp} ${t({ en: "false", es: "falsos" }, locale)}` : ""}
          </span>
        )}
      </div>

      {/* The code surface */}
      <div
        className="card"
        style={{ padding: 0, overflow: "hidden", background: "var(--bg)", borderColor: "var(--hairline-2)" }}
      >
        <pre style={{ margin: 0, overflowX: "auto", fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: 1.7 }}>
          <code style={{ display: "block" }}>
            {GAUNTLET.lines.map((line) => {
              const mark = markByLine.get(line.n);
              const isFlaw = !!line.flaw;
              const inDebrief = phase === "debrief";
              // Debrief coloring: correct hit (green), miss (amber left-mark), false-pos (red).
              let bg = "transparent";
              let leftBar = "transparent";
              if (inDebrief) {
                if (mark && isFlaw) {
                  leftBar = mark.class === line.flaw!.class ? "var(--ok)" : "var(--warn)";
                  bg = "color-mix(in oklab, var(--ok) 8%, transparent)";
                } else if (mark && !isFlaw) {
                  leftBar = "var(--bad)";
                  bg = "var(--bad-bg)";
                } else if (isFlaw) {
                  leftBar = "var(--warn)"; // missed
                  bg = "var(--warn-bg)";
                }
              } else if (mark) {
                leftBar = "var(--ai-signal)";
                bg = "color-mix(in oklab, var(--ai-signal) 10%, transparent)";
              }
              const clickable = phase === "hunt" && line.text.trim().length > 0;
              return (
                <div
                  key={line.n}
                  onClick={() => clickable && toggleLine(line.n)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr",
                    background: bg,
                    borderLeft: `2px solid ${leftBar}`,
                    cursor: clickable ? "pointer" : "default",
                    transition: "background var(--fast) var(--eout)",
                  }}
                >
                  <span
                    style={{
                      textAlign: "right",
                      paddingRight: 12,
                      color: "var(--text-4)",
                      userSelect: "none",
                    }}
                  >
                    {line.n}
                  </span>
                  <span style={{ whiteSpace: "pre", paddingRight: 16, color: line.text.startsWith("  //") || line.text.startsWith("//") ? "var(--text-3)" : "var(--text-2)" }}>
                    {line.text || " "}
                    {inDebrief && mark && isFlaw && (
                      <span className="mono" style={{ marginLeft: 10, fontSize: 11, color: mark.class === line.flaw!.class ? "var(--ok)" : "var(--warn)" }}>
                        {mark.class === line.flaw!.class ? "✓" : "≈"} {t(FLAW_CLASS_BY_ID[mark.class].label, locale)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>

      {/* Class picker for the line just flagged */}
      {phase === "hunt" && active !== null && (
        <div className="card" style={{ borderColor: "var(--ai-signal)" }}>
          <p className="eyebrow" style={{ marginBottom: "var(--s-3)" }}>
            {t({ en: "Line", es: "Línea" }, locale)} {active} — {t({ en: "what class of flaw?", es: "¿qué clase de defecto?" }, locale)}
          </p>
          <div style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
            {FLAW_CLASSES.map((fc) => (
              <button
                key={fc.id}
                className="btn"
                onClick={() => assignClass(active, fc.id)}
                style={{ fontSize: "var(--t-xs)" }}
              >
                {t(fc.label, locale)}
                {fc.owasp && <span className="mono" style={{ marginLeft: 6, color: "var(--ai-accent)", fontSize: 10 }}>{fc.owasp}</span>}
              </button>
            ))}
            <button className="btn" onClick={() => setActive(null)} style={{ fontSize: "var(--t-xs)", color: "var(--text-3)" }}>
              {t({ en: "cancel", es: "cancelar" }, locale)}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {phase === "hunt" ? (
        <div style={{ display: "flex", gap: "var(--s-3)", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-ai btn-primary" onClick={grade} disabled={marks.length === 0}
            style={marks.length === 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
            {t({ en: "Submit red-team", es: "Enviar red-team" }, locale)}
          </button>
          <span className="dim" style={{ fontSize: "var(--t-xs)" }}>
            {t({ en: "Click a line to flag it, then classify. Click again to un-flag.", es: "Haz clic en una línea para marcarla, luego clasifícala. Clic de nuevo para desmarcar." }, locale)}
          </span>
        </div>
      ) : (
        result && (
          <Debrief locale={locale} score={pct} isFirst={result.isFirst} onRetry={reset} />
        )
      )}
    </div>
  );
}

function Debrief({ locale, score, isFirst, onRetry }: { locale: Locale; score: number; isFirst: boolean; onRetry: () => void }) {
  const flaws = GAUNTLET.lines.filter((l) => l.flaw);
  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="card" style={{ borderColor: score >= 80 ? "var(--ok)" : "var(--warn)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: "2.5rem", lineHeight: 1, color: score >= 80 ? "var(--ok)" : "var(--warn)" }}>{score}%</span>
          <span style={{ fontSize: "var(--t-sm)", color: "var(--text-2)" }}>
            {score >= 80
              ? t({ en: "Threshold crossed. You reviewed AI code like a staff engineer.", es: "Umbral cruzado. Revisaste código de IA como un ingeniero staff." }, locale)
              : t({ en: "Below the bar. Read every exploit below, then run it again.", es: "Bajo el listón. Lee cada exploit abajo, luego repítelo." }, locale)}
          </span>
        </div>
        <p className="dim" style={{ fontSize: "var(--t-xs)", marginTop: "var(--s-3)" }}>
          {isFirst
            ? t({ en: "This was your cold read — the score that counts, since the debrief reveals every flaw. Replays are practice.", es: "Esta fue tu lectura a ciegas — el puntaje que cuenta, porque el debrief revela cada defecto. Las repeticiones son práctica." }, locale)
            : t({ en: "Replay (practice). Your cold-read score is the one on your record.", es: "Repetición (práctica). Tu puntaje a ciegas es el que queda en tu registro." }, locale)}
        </p>
      </div>

      <p className="eyebrow">{t({ en: "After-action — every planted flaw", es: "Análisis — cada defecto plantado" }, locale)}</p>
      <div className="stack" style={{ gap: "var(--s-3)" }}>
        {flaws.map((l) => {
          const fc = FLAW_CLASS_BY_ID[l.flaw!.class];
          return (
            <div key={l.n} className="card" style={{ padding: "var(--s-4)" }}>
              <div style={{ display: "flex", gap: "var(--s-3)", alignItems: "center", marginBottom: "var(--s-2)", flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: "var(--t-xs)", color: "var(--ai-signal)" }}>{t({ en: "line", es: "línea" }, locale)} {l.n}</span>
                <span className="level-tag" data-track="ai" style={{ borderColor: "var(--ai)", color: "var(--ai-accent)", background: "color-mix(in oklab, var(--ai) 12%, transparent)" }}>
                  {t(fc.label, locale)}{fc.owasp ? ` · ${fc.owasp}` : ""}
                </span>
              </div>
              <p style={{ fontSize: "var(--t-sm)", color: "var(--text)", marginBottom: "var(--s-2)" }}>
                <strong style={{ color: "var(--bad)" }}>{t({ en: "Exploit", es: "Exploit" }, locale)}: </strong>
                {t(l.flaw!.exploit, locale)}
              </p>
              <p style={{ fontSize: "var(--t-sm)", color: "var(--text-2)" }}>
                <strong style={{ color: "var(--ok)" }}>{t({ en: "Fix", es: "Arreglo" }, locale)}: </strong>
                {t(l.flaw!.fix, locale)}
              </p>
            </div>
          );
        })}
      </div>

      <div>
        <button className="btn btn-ai btn-primary" onClick={onRetry}>
          {t({ en: "Run it again", es: "Repetir" }, locale)}
        </button>
      </div>
    </div>
  );
}
