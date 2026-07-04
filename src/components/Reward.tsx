"use client";
// The threshold-crossing reward layer. The whole design system reserved the
// spring curve "for reward moments ONLY" — this is where they finally fire.
//
// It is NOT a celebration. Per SDT / the overjustification research, the reward
// is competence-INFORMATIONAL: a single instrument-panel readout that tells you
// what you just crossed ("DEPTH — star charted. You crossed into L5 territory.")
// plus a Signal count-up. No confetti, no mascot, no "Great job!".
//
// Store functions dispatch a `levelup:reward` CustomEvent; this listener renders
// a toast + a one-shot glow bloom. Fully gated on prefers-reduced-motion (the
// toast still appears, just without spring/bloom — the reset in globals.css
// neutralizes the animation).
import { useEffect, useRef, useState } from "react";
import { usePrefersMotion } from "@/lib/motion";

export interface RewardDetail {
  kind: "mastery" | "room" | "boss" | "gauntlet";
  /** short instrument label, already localized, e.g. "DEPTH · STAR CHARTED" */
  title: string;
  /** one in-voice sentence, already localized */
  body: string;
  /** track accent hint */
  track?: "general" | "ai";
  /** optional signal delta to show as +N */
  signal?: number;
}

/** Fire a reward from anywhere (store, components). No-op during SSR. */
export function fireReward(detail: RewardDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<RewardDetail>("levelup:reward", { detail }));
}

interface Active extends RewardDetail {
  id: number;
  leaving: boolean;
}

export function RewardHost() {
  const [active, setActive] = useState<Active | null>(null);
  const motion = usePrefersMotion();
  const timers = useRef<number[]>([]);

  useEffect(() => {
    function onReward(e: Event) {
      const d = (e as CustomEvent<RewardDetail>).detail;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      const id = performance.now();
      setActive({ ...d, id, leaving: false });
      // auto-dismiss: hold, then animate out
      const hold = window.setTimeout(() => {
        setActive((a) => (a && a.id === id ? { ...a, leaving: true } : a));
      }, 4200);
      const gone = window.setTimeout(() => {
        setActive((a) => (a && a.id === id ? null : a));
      }, 4600);
      timers.current.push(hold, gone);
    }
    window.addEventListener("levelup:reward", onReward as EventListener);
    return () => {
      window.removeEventListener("levelup:reward", onReward as EventListener);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  if (!active) return null;
  const track = active.track ?? "general";

  return (
    <div
      className="reward-toast"
      data-track={track}
      data-leaving={active.leaving ? "true" : "false"}
      role="status"
      aria-live="polite"
    >
      <span className="rt-glyph" aria-hidden="true">
        <IgniteGlyph animate={motion && !active.leaving} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="rt-title">{active.title}</div>
        <div className="rt-body">{active.body}</div>
        {typeof active.signal === "number" && active.signal > 0 && (
          <div
            className="mono"
            style={{
              marginTop: 6,
              fontSize: "var(--t-xs)",
              color: "var(--track-accent, var(--gen-accent))",
              letterSpacing: "0.06em",
            }}
          >
            +{active.signal} SIGNAL
          </div>
        )}
      </div>
    </div>
  );
}

// A star igniting: a core dot, a 4-point diffraction spike, and a one-shot glow
// bloom ring. Mirrors the StarChart's magnitude-3 star vocabulary exactly, so
// the reward reads as "this node just lit up on your chart".
function IgniteGlyph({ animate }: { animate: boolean }) {
  return (
    <svg width="34" height="34" viewBox="-17 -17 34 34" role="img" aria-hidden="true">
      {animate && (
        <circle r="6" fill="none" stroke="currentColor" strokeWidth="1">
          <animate attributeName="r" values="4;15" dur="900ms" fill="freeze" />
          <animate attributeName="opacity" values="0.9;0" dur="900ms" fill="freeze" />
        </circle>
      )}
      <path
        d="M0,-13 L0,13 M-13,0 L13,0"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.55"
      />
      <circle r="5" fill="currentColor">
        {animate && <animate attributeName="r" values="0;6.2;5" dur="700ms" fill="freeze" />}
      </circle>
    </svg>
  );
}
