"use client";
/**
 * Authored explanation prose, with structure.
 *
 * `explanation` used to render as flat `<p>` elements, which forced every concept
 * to be written as running paragraphs. Reviewing concept 1 of cloud-platform-l5
 * with the owner, that turned out to be the root of the "wall of text, and I still
 * don't know what this is" problem: with no way to bold a term or list three
 * costs, an author has no choice but prose, and prose hides the shape.
 *
 * So authors can now use exactly three marks, and nothing else:
 *   **bold**  — the words a reader must retain
 *   `code`    — an identifier or a literal
 *   - bullet  — a list item (also `* ` or `1. `)
 *   ## label  — a short section label inside a concept
 *
 * Deliberately not a markdown implementation: no links, images, tables, or nested
 * lists. Each of those would be a way to smuggle layout into content, and the
 * layout decisions here belong to the pane. The inline tokenizer is the same one
 * the code artifacts use (./inline-md), already unit-tested against the
 * cross-line-wrap case.
 */
import { tokenizeLine, headingLevel, type MdToken } from "./inline-md";

function inline(text: string, keyBase: string): React.ReactNode[] {
  return tokenizeLine(text).map((tk: MdToken, i: number) => {
    const key = `${keyBase}-${i}`;
    if (tk.kind === "code") return <code key={key} className="prose-code">{tk.value}</code>;
    if (tk.kind === "bold") return <strong key={key}>{tk.value}</strong>;
    if (tk.kind === "italic") return <em key={key}>{tk.value}</em>;
    return <span key={key}>{tk.value}</span>;
  });
}

const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;

/** One block: a paragraph, a run of bullets, a numbered run, or a label. */
type Block =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "h"; text: string };

/**
 * Group authored lines into blocks.
 *
 * Consecutive bullets become ONE list — the reason this is a grouping pass rather
 * than a per-line map. A bullet run interrupted by a paragraph correctly starts a
 * new list, because that is what the author wrote.
 */
export function blocksFrom(lines: string[]): Block[] {
  const out: Block[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const h = headingLevel(line);
    if (h > 0) { out.push({ kind: "h", text: line.replace(/^#{1,6}\s+/, "") }); continue; }
    const b = BULLET.exec(line);
    if (b) {
      const last = out[out.length - 1];
      if (last?.kind === "ul") last.items.push(b[1]);
      else out.push({ kind: "ul", items: [b[1]] });
      continue;
    }
    const n = NUMBERED.exec(line);
    if (n) {
      const last = out[out.length - 1];
      if (last?.kind === "ol") last.items.push(n[2]);
      else out.push({ kind: "ol", items: [n[2]] });
      continue;
    }
    out.push({ kind: "p", text: line });
  }
  return out;
}

/** How much of the reader's attention a block asks for, in words. */
export function blockWords(b: Block): number {
  const text = b.kind === "ul" || b.kind === "ol" ? b.items.join(" ") : b.text;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ProseBlocks({
  blocks, keyBase = "b", className,
}: {
  blocks: Block[];
  keyBase?: string;
  /**
   * Extra class on every block this call renders.
   *
   * Exists so the concept pane can mark its DEFINITION blocks (`cp-def`) and
   * reorder them on a phone via CSS `order`. Positional selectors could not do it:
   * `.cp-para:first-of-type` matches nothing, because `.cp-why` is the first `<p>`
   * in the card and is not a `.cp-para`.
   */
  className?: string;
}) {
  const cx = (base: string) => (className ? `${base} ${className}` : base);
  return (
    <>
      {blocks.map((b, i) => {
        const key = `${keyBase}${i}`;
        if (b.kind === "h") return <p key={key} className={cx("eyebrow cp-sublabel")}>{inline(b.text, key)}</p>;
        if (b.kind === "ul") {
          return (
            <ul key={key} className={cx("cp-list")}>
              {b.items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}
            </ul>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol key={key} className={cx("cp-list cp-list--num")}>
              {b.items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}
            </ol>
          );
        }
        return <p key={key} className={cx("prose cp-para")}>{inline(b.text, key)}</p>;
      })}
    </>
  );
}

export type { Block };
