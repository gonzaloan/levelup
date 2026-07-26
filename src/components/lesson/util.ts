// Small shared helpers for the lesson view + its subcomponents.
import type { AxisId, Level } from "@/lib/axes";
import { DOMAIN_BY_ID } from "@/lib/curriculum";

/** Split authored prose into trimmed, non-empty paragraphs. */
export function para(s: string): string[] {
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

/**
 * Split a paragraph into a short lead and the remainder, at a sentence boundary.
 *
 * Authored overviews open with a 46-93 word sentence in eight of the 35 lessons,
 * which is ~500px of phone screen before anything actionable. Rather than ask
 * every author to rewrite, we take whole sentences up to a soft word budget and
 * defer the rest — so the fold always cuts where a reader would pause.
 *
 * Sentence detection is deliberately conservative: a terminator followed by
 * whitespace and an opening character. It does not try to handle abbreviations,
 * because the fallback when it finds no boundary is simply "show the whole
 * paragraph", which is the current behaviour and never wrong-looking.
 */
export function leadAndRest(text: string, maxWords = 34): [string, string] {
  const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  if (!sentences || sentences.length < 2) return [text, ""];
  const lead: string[] = [];
  let words = 0;
  for (const s of sentences) {
    const n = s.trim().split(/\s+/).length;
    // Always take the first sentence, however long — a fragment reads worse
    // than a long-but-complete opening line.
    if (lead.length > 0 && words + n > maxWords) break;
    lead.push(s.trim());
    words += n;
  }
  const rest = sentences.slice(lead.length).map((s) => s.trim()).join(" ");
  return [lead.join(" "), rest];
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
