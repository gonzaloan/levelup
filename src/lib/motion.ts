"use client";
// The motion layer's React seam. Everything degrades to a correct static state
// under prefers-reduced-motion and under SSR (static export renders final state).
import { useEffect, useRef, useState } from "react";

/** True once the user has NOT opted out of motion. SSR-safe (starts false). */
export function usePrefersMotion(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    setOk(mq.matches);
    const on = () => setOk(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return ok;
}

/**
 * Reveal-on-scroll, fail-safe. Content is VISIBLE by default (SSR, no-JS,
 * reduced-motion, or missing IntersectionObserver all render final state) — the
 * hide-then-reveal is only *armed* when motion is enabled and IO is available.
 * This makes it impossible for content to get stuck invisible, which is the #1
 * scroll-animation failure mode.
 *
 * Wire `data-reveal`, `data-armed={armed}`, `data-revealed={shown}`, and an
 * optional `--i` stagger index. The CSS only hides when data-armed="true".
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(opts?: {
  threshold?: number;
  once?: boolean;
}) {
  const ref = useRef<T | null>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      // Never arm — element stays at its default (visible) state.
      setShown(true);
      return;
    }
    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            if (opts?.once !== false) io.unobserve(e.target);
          } else if (opts?.once === false) {
            setShown(false);
          }
        }
      },
      { threshold: opts?.threshold ?? 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [opts?.threshold, opts?.once]);
  return { ref, armed, shown };
}

/**
 * Count a number up to `value` when it first enters view. Returns the current
 * display value. Under reduced motion it jumps straight to the target. Uses a
 * time-based ease so it never drops frames on slow devices.
 */
export function useCountUp(value: number, opts?: { duration?: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const dur = opts?.duration ?? 900;
  const dec = opts?.decimals ?? 0;
  useEffect(() => {
    const el = ref.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !el || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }
    let raf = 0;
    let start = 0;
    let ran = false;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !ran) {
            ran = true;
            raf = requestAnimationFrame(step);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [value, dur]);
  const shown = dec > 0 ? display.toFixed(dec) : Math.round(display).toString();
  return { ref, shown };
}
