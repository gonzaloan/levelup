"use client";
// The ambient observatory background, mounted once in the root layout. A fixed,
// GPU-cheap parallax starfield with per-star twinkle behind the whole app, plus
// two soft light sources (in .sky, from CSS). Deterministic star coordinates —
// NEVER Math.random at runtime — so SSR and hydration match and the sky is
// stable across renders. All motion is CSS-gated on prefers-reduced-motion.
import { useMemo } from "react";

// A small seeded PRNG (mulberry32) so the field is fixed but not hand-typed.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number;
  y: number;
  r: number;
  min: number;
  max: number;
  dur: number;
  warm: boolean;
}

function buildField(count: number): Star[] {
  const rnd = mulberry32(0x1e5c0);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const r = rnd();
    stars.push({
      x: rnd() * 100,
      y: rnd() * 100,
      r: r < 0.82 ? 0.6 : r < 0.96 ? 1.0 : 1.6, // mostly faint, a few bright
      min: 0.06 + rnd() * 0.12,
      max: 0.28 + rnd() * 0.45,
      dur: 3.5 + rnd() * 6,
      warm: rnd() > 0.86, // a scattering of warm catalog stars
    });
  }
  return stars;
}

export function Sky() {
  const stars = useMemo(() => buildField(120), []);
  return (
    <>
      <div className="sky" aria-hidden="true" />
      <div className="sky-stars" aria-hidden="true">
        <svg
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          className="sky-stars-drift"
          style={{ position: "absolute", inset: 0 }}
        >
          {stars.map((s, i) => (
            <circle
              key={i}
              cx={`${s.x}%`}
              cy={`${s.y}%`}
              r={s.r}
              className="sky-star-tw"
              fill={s.warm ? "var(--star)" : "#cfe1f7"}
              style={{
                // twinkle bounds + duration as CSS vars (read by lu-twinkle)
                ["--tw-min" as string]: String(s.min),
                ["--tw-max" as string]: String(s.max),
                ["--tw-dur" as string]: `${s.dur}s`,
                animationDelay: `${(i % 12) * 0.4}s`,
                opacity: s.min,
              }}
            />
          ))}
        </svg>
      </div>
    </>
  );
}
