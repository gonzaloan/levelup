// Small shared helpers for the lesson view + its subcomponents.
import type { Level } from "@/lib/axes";

/** Split authored prose into trimmed, non-empty paragraphs. */
export function para(s: string): string[] {
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

export function lessonLevel(id: string): Level {
  return id.split("-").pop()!.toUpperCase() as Level;
}

export function lessonAxisId(id: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const map: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
    "technical-depth": 1, "systems-architecture": 2, "execution-delivery": 3,
    "direction-influence": 4, "leveling-scope": 5, "ai-engineering": 6,
  };
  const domain = id.replace(/-l[3-7]$/, "");
  return map[domain] ?? 1;
}
