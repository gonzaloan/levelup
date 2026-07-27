/**
 * Minimal inline markdown for prose artifacts: **bold** and `code`.
 *
 * Deliberately tiny, and deliberately NOT a markdown parser. These artifacts
 * (strategy memos, decision registers, review comments) are shown because their
 * shape is the lesson — but a memo whose emphasis markers are still visible as
 * `**` reads as unrendered source, which puts noise between the reader and the
 * argument. Two constructs don't justify a dependency, and anything a real
 * parser got wrong would corrupt authored content silently.
 *
 * Headings, lists and tables are handled at the line level by the renderer, so
 * they stay visible as structure rather than being reinterpreted.
 *
 * This module returns DATA, not JSX: the tokenizer is the part with the edge
 * cases, so it lives where it can be unit-tested without a React runtime.
 */

/** Emphasis carried across lines. Mutated in place by `tokenizeInline`. */
export type MdState = { bold: boolean; code: boolean };

export type MdToken = { kind: "text" | "bold" | "code"; value: string };

export const freshState = (): MdState => ({ bold: false, code: false });

/**
 * Tokenize one line, carrying emphasis state in and out.
 *
 * The state is the whole point. Authored artifacts are hard-wrapped at ~80
 * columns, so a `**…**` span routinely opens on one line and closes on the next:
 *
 *     it loses every planning cycle. **Agreement is the
 *     problem** — it costs nothing and commits nobody.
 *
 * A per-line regex matches neither half and the reader sees literal asterisks on
 * both. Walking the delimiters statefully handles the wrap.
 */
export function tokenizeInline(text: string, state: MdState): MdToken[] {
  const out: MdToken[] = [];
  let buf = "";
  const flush = () => {
    if (!buf) return;
    out.push({ kind: state.code ? "code" : state.bold ? "bold" : "text", value: buf });
    buf = "";
  };
  for (let i = 0; i < text.length; i++) {
    // Inside a code span only a closing backtick is a delimiter, so `**` in a
    // snippet stays literal — which is correct, since it IS code.
    if (state.code) {
      if (text[i] === "`") { flush(); state.code = false; continue; }
      buf += text[i];
      continue;
    }
    if (text[i] === "`") { flush(); state.code = true; continue; }
    if (text[i] === "*" && text[i + 1] === "*") { flush(); state.bold = !state.bold; i++; continue; }
    buf += text[i];
  }
  flush();
  return out;
}

/** Tokenize a standalone line (heading, list item, table row). */
export function tokenizeLine(text: string): MdToken[] {
  return tokenizeInline(text, freshState());
}

/** Heading level of a prose line, or 0. Used to style, not to reinterpret. */
export function headingLevel(line: string): number {
  const mt = /^(#{1,6})\s/.exec(line.trim());
  return mt ? mt[1].length : 0;
}
