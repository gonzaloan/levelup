"use client";
// Small presentational wrappers over the motion hooks (src/lib/motion.ts).
import type { ElementType, ReactNode } from "react";
import { useReveal, useCountUp } from "@/lib/motion";

/**
 * Reveal-on-scroll wrapper. Renders as `as` (default div), sets the reveal
 * data-attrs, and threads a stagger index via the --i custom property.
 */
export function Reveal({
  children,
  as: As = "div",
  index = 0,
  className,
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, armed, shown } = useReveal<HTMLElement>();
  return (
    <As
      ref={ref as never}
      data-reveal=""
      data-armed={armed ? "true" : "false"}
      data-revealed={shown ? "true" : "false"}
      className={className}
      style={{ ["--i" as string]: String(index), ...style }}
    >
      {children}
    </As>
  );
}

/** A number that counts up when scrolled into view. Mono, tabular by default. */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  className,
  style,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, shown } = useCountUp(value, { decimals });
  return (
    <span ref={ref} className={className} style={style}>
      {shown}
      {suffix}
    </span>
  );
}
