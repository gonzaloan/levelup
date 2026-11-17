"use client";
// One entry per lab in content/labs.json (the content gate checks both lists match). Each lab is
// its own chunk: a lab page loads only its own code.
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { Locale } from "@/lib/types";

type LabProps = { locale: Locale };
export const LABS: Record<string, ComponentType<LabProps>> = {
  "capacity": dynamic(() => import("./capacity")),
  "latency": dynamic(() => import("./latency")),
  "big-o": dynamic(() => import("./big-o")),
  "sliding-window": dynamic(() => import("./sliding-window")),
  "consistent-hashing": dynamic(() => import("./consistent-hashing")),
  "rate-limiter": dynamic(() => import("./rate-limiter")),
  "quorum": dynamic(() => import("./quorum")),
  "gpu-memory": dynamic(() => import("./gpu-memory")),
  "sampling": dynamic(() => import("./sampling")),
};

export function LabView({ id, locale }: { id: string; locale: Locale }) {
  const Lab = LABS[id];
  return Lab ? <Lab locale={locale} /> : null;
}
