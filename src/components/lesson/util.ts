// Small shared helpers for the lesson view + its subcomponents.
import type { AxisId, Level } from "@/lib/axes";
import { DOMAIN_BY_ID } from "@/lib/curriculum";

/** Split authored prose into trimmed, non-empty paragraphs. */
export function para(s: string): string[] {
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

export function lessonLevel(id: string): Level {
  return id.split("-").pop()!.toUpperCase() as Level;
}

/**
 * The axis a lessonId belongs to, read from the curriculum spine.
 *
 * This was a hardcoded domain→axis map with a silent `?? 1` fallback, which meant
 * a new domain didn't fail — it rendered every one of its lessons under the FIRST
 * axis's name and colour. Deriving it from the spine makes the mapping impossible
 * to get out of sync, and an unknown id now throws instead of lying.
 */
export function lessonAxisId(id: string): AxisId {
  const domainId = id.replace(/-l[3-7]$/, "");
  const axisId = DOMAIN_BY_ID.get(domainId)?.axisId;
  if (!axisId) throw new Error(`lessonAxisId: no spine domain for lessonId "${id}"`);
  return axisId;
}
