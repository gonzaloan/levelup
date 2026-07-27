"use client";
// CodeView — the interactive "show the code" layer of the context rail. A
// reinterpretation of get-certified/src/code-view.js in TSX (no vanilla DOM):
//   1. RAINBOW BRACKETS — depth-colored ()[]{} via a string/comment-aware
//      tokenizer, so only *structural* brackets are tinted (never braces inside
//      strings or comments). HTML-safe by construction (React renders text).
//   2. HOVER-TO-EXPLAIN — annotations[{line,note}] turn whole lines into
//      keyboard-focusable, screen-reader-wired popovers. Hover OR focus opens;
//      Esc / blur / tap-away closes; exactly one open at a time. This is the
//      flagship "pon el mouse arriba y explica qué pasa" affordance.
//   3. REVEAL/COLLAPSE — snippets > 12 lines collapse behind a toggle.
//   4. COPY — navigator.clipboard with a non-throwing execCommand fallback.
// The copyable text is always the raw `snippet` byte-for-byte — presentation
// never mutates it. All motion is reduced-motion gated in CSS. Determinism:
// ids are seeded from useId(), no Date.now/Math.random at render.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { t, type Locale, type I18nText } from "@/i18n/config";
import { m } from "@/i18n/messages";
import type { ConceptCode } from "@/lib/types";
import { tokenizeInline, tokenizeLine, headingLevel, freshState, type MdState, type MdToken } from "./inline-md";

const REVEAL_LINES = 12; // snippets with <= this many lines render open

/** Render inline-markdown tokens. The tokenizer lives in ./inline-md (unit-tested). */
function renderMd(tokens: MdToken[], keyBase: string): React.ReactNode[] {
  return tokens.map((tk, i) => {
    const key = `${keyBase}s${i}`;
    if (tk.kind === "code") return <code key={key} className="cv-inline-code">{tk.value}</code>;
    if (tk.kind === "bold") return <strong key={key}>{tk.value}</strong>;
    if (tk.kind === "italic") return <em key={key}>{tk.value}</em>;
    return <span key={key}>{tk.value}</span>;
  });
}

// ── rainbow-brace tokenizer ────────────────────────────────────────────────
// Walks the source char-by-char tracking string / comment state so we only
// colour STRUCTURAL brackets. Comment/string syntax is approximated per
// language family — good enough for short teaching snippets, and never throws.
type Seg = { kind: "text"; value: string } | { kind: "brace"; value: string; depth: number };
type CodeLine = Seg[];

/**
 * Languages whose snippets are prose, not code.
 *
 * The corpus now carries markdown artifacts — strategy memos, decision registers,
 * review comments — because at L6/L7 the deliverable IS a document, and showing
 * its real shape is the lesson. Running the bracket-depth colouring over prose
 * paints every parenthesis in a sentence like a nested expression, which reads
 * as noise. Prose gets line semantics and nothing else.
 */
const PROSE_LANGS = new Set(["markdown", "md"]);

/**
 * Prose langs get their hard wraps rejoined into paragraphs. `text` deliberately
 * does NOT: a plain-text artifact in this corpus is a hand-aligned table
 * (`billed:` / `idle saving:` / `risk:` in columns), and rejoining collapsed
 * three labelled rows into one run-on sentence — the artifact's shape WAS the
 * lesson, and the reflow deleted it. `text` keeps `white-space: pre` and its own
 * alignment, which is the whole reason an author chose it over markdown.
 */
const PRE_LANGS = new Set(["text", "txt"]);

/**
 * Group a prose artifact's hard-wrapped lines back into paragraphs.
 *
 * Authored memos are wrapped at ~80 columns, which is correct in the source file
 * and wrong on a 390px screen: preserving those newlines breaks every sentence
 * mid-clause. Rejoining is only safe for continuation lines, so structural
 * markdown — headings, list items, table rows, quotes, fences — stays on its own
 * line. Annotations still address individual SOURCE lines, so the grouping never
 * changes what an annotation points at.
 *
 * Returns arrays of 0-based line indices; a single-element group is a standalone
 * line, and an empty-line group is a paragraph break.
 */
export const STRUCTURAL = /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|\||>|```|\[|!\[|\s*$)/;

/** A line that starts a list item or numbered item — it can be CONTINUED. */
const LIST_ITEM = /^\s*([-*+]\s|\d+[.)]\s)/;

export function paragraphGroups(rawLines: string[]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  const flush = () => { if (current.length) { groups.push(current); current = []; } };
  rawLines.forEach((line, i) => {
    if (STRUCTURAL.test(line)) {
      flush();
      // A list item is structural but WRAPPABLE: a bullet hard-wrapped at 80
      // columns continues on the next non-structural line, and grouping the item
      // alone left 27 dangling fragments in the corpus ("shared on-call runbook,
      // upgrade automation." rendering as its own line under its bullet). Start a
      // group the item can absorb its continuation into; a heading or table row
      // still stands alone, because those never wrap semantically.
      if (LIST_ITEM.test(line)) current.push(i);
      else groups.push([i]);
      return;
    }
    current.push(i);
  });
  flush();
  return groups;
}

/**
 * In a diff, the leading +/- IS the meaning — a reader who can't see at a glance
 * which side is which has to parse the whole hunk. So diff lines get a class
 * rather than token colouring.
 */
function diffClass(line: string): string | undefined {
  if (/^\+\+\+|^---/.test(line)) return "cv-d-file";
  if (line.startsWith("@@")) return "cv-d-hunk";
  if (line.startsWith("+")) return "cv-d-add";
  if (line.startsWith("-")) return "cv-d-del";
  return undefined;
}

function tokenizeLines(src: string, lang: string): CodeLine[] {
  const l = (lang || "").toLowerCase();
  if (PROSE_LANGS.has(l) || PRE_LANGS.has(l) || l === "diff") {
    // No tokenizing: split on newlines and let the line-level classes carry it.
    return src.split("\n").map((line) => (line ? [{ kind: "text" as const, value: line }] : []));
  }
  const hashComment = /py|python|bash|sh|shell|zsh|yaml|yml|rb|ruby|toml|makefile|dockerfile|r$|perl|pl/.test(l);
  const slashComment = /js|javascript|ts|typescript|tsx|jsx|java|c|cc|cpp|h|hpp|cs|go|rust|rs|json5|kotlin|kt|swift|php|scala|dart|proto/.test(l);

  const segs: Seg[] = [];
  let buf = "";
  let depth = 0;
  const n = src.length;
  let i = 0;
  const flush = () => { if (buf) { segs.push({ kind: "text", value: buf }); buf = ""; } };

  while (i < n) {
    const ch = src[i];
    const next = i + 1 < n ? src[i + 1] : "";

    // line comment (#)
    if (hashComment && ch === "#") {
      let j = i;
      while (j < n && src[j] !== "\n") j++;
      buf += src.slice(i, j); i = j; continue;
    }
    // line comment (//)
    if (slashComment && ch === "/" && next === "/") {
      let j = i;
      while (j < n && src[j] !== "\n") j++;
      buf += src.slice(i, j); i = j; continue;
    }
    // block comment (/* … */)
    if (slashComment && ch === "/" && next === "*") {
      let j = src.indexOf("*/", i + 2);
      j = j === -1 ? n : j + 2;
      buf += src.slice(i, j); i = j; continue;
    }
    // string literal ' " ` with escape handling
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === quote) { j++; break; }
        j++;
      }
      buf += src.slice(i, j); i = j; continue;
    }
    // opening structural bracket
    if (ch === "(" || ch === "[" || ch === "{") {
      flush();
      segs.push({ kind: "brace", value: ch, depth: depth % 6 });
      depth++; i++; continue;
    }
    // closing structural bracket
    if (ch === ")" || ch === "]" || ch === "}") {
      flush();
      depth = Math.max(0, depth - 1);
      segs.push({ kind: "brace", value: ch, depth: depth % 6 });
      i++; continue;
    }
    buf += ch; i++;
  }
  flush();

  // Split the flat token run into 1-based source lines, splitting text tokens
  // on "\n" (brace tokens never contain a newline). Line numbering matches the
  // raw snippet exactly, so annotation `line` indices line up.
  const lines: CodeLine[] = [[]];
  for (const s of segs) {
    if (s.kind === "text" && s.value.includes("\n")) {
      const parts = s.value.split("\n");
      for (let p = 0; p < parts.length; p++) {
        if (p > 0) lines.push([]);
        if (parts[p]) lines[lines.length - 1].push({ kind: "text", value: parts[p] });
      }
    } else {
      lines[lines.length - 1].push(s);
    }
  }
  return lines;
}

// Non-throwing clipboard fallback for browsers without the async API (or when
// it rejects, e.g. insecure context / denied permission).
function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function CodeView({
  code, locale, track, lead = false,
}: {
  code: ConceptCode;
  locale: Locale;
  track: "general" | "ai";
  /**
   * True when this snippet IS the concept's primary figure.
   *
   * The collapse-over-12-lines default is right for a snippet that supports
   * prose further down the pane. It is wrong when the code is the visual the
   * pane leads with: 76 of 111 artifacts are longer than 12 lines, so the
   * "visual within the first screen" promise was being met by a button that
   * said "show 37 lines". A lead artifact opens, and gets a capped height with
   * a fade so it still can't run away down the page.
   */
  lead?: boolean;
}) {
  const { lang, snippet, caption, annotations } = code;

  const lines = useMemo(() => tokenizeLines(snippet, lang), [snippet, lang]);
  const lineCount = lines.length;
  // Per-line diff classes, resolved from the raw source so they can't drift out
  // of step with the tokenized lines.
  const diffClasses = useMemo(
    () => ((lang || "").toLowerCase() === "diff" ? snippet.split("\n").map(diffClass) : null),
    [snippet, lang],
  );
  const langLower = (lang || "").toLowerCase();
  // isProse drives BOTH the reading typography and the paragraph rejoin. `text`
  // wants the first and must not get the second, so it is tracked separately.
  const isProse = PROSE_LANGS.has(langLower);
  const isPre = PRE_LANGS.has(langLower);
  const isDiff = (lang || "").toLowerCase() === "diff";
  /**
   * Diff lines, tokenized once with emphasis state carried across lines.
   *
   * A diff is two interleaved documents, so the state is per SIDE: a `**` opened
   * on a `+` line is closed on the next `+` line, and the `-` lines in between
   * must not see it. Keeping one state per marker is what makes a wrapped bold
   * span render as bold on both halves instead of showing literal asterisks on
   * one and swallowing the other.
   */
  const diffTokens = useMemo(() => {
    if (!isDiff) return [];
    const byside: Record<string, MdState> = { "+": freshState(), "-": freshState(), " ": freshState() };
    return snippet.split("\n").map((raw) => {
      const marker = /^[+\- ]/.test(raw) ? raw[0] : "";
      const state = byside[marker] ?? byside[" "];
      return { marker, tokens: tokenizeInline(raw.slice(marker.length), state) };
    });
  }, [isDiff, snippet]);
  const rawLines = useMemo(() => snippet.split("\n"), [snippet]);
  // Prose only: rejoin hard-wrapped continuation lines into paragraphs so a memo
  // reads as a document on a phone instead of breaking mid-sentence every 80 cols.
  const proseGroups = useMemo(
    () => (isProse ? paragraphGroups(rawLines) : null),
    [isProse, rawLines],
  );
  const annoMap = useMemo(() => {
    const map = new Map<number, I18nText>();
    (annotations ?? []).forEach((a) => map.set(a.line, a.note));
    return map;
  }, [annotations]);
  const hasAnnotations = annoMap.size > 0;

  // A lead artifact is never collapsed: it is the figure the pane promised.
  const collapsible = !lead && lineCount > REVEAL_LINES;
  const [open, setOpen] = useState(!collapsible); // deterministic on SSR + client
  // A long lead artifact gets a capped viewport instead of a collapse, so the
  // reader sees real code immediately without the pane growing without bound.
  const capped = lead && lineCount > REVEAL_LINES;
  const [uncapped, setUncapped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openLine, setOpenLine] = useState<number | null>(null);

  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const focusedLine = useRef<number | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeTip = useCallback(() => setOpenLine(null), []);

  // Tap-away: a pointer press anywhere outside this component dismisses the
  // open popover (presses inside are handled by the line's own handlers).
  useEffect(() => {
    if (openLine == null) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && rootRef.current && rootRef.current.contains(target)) return;
      closeTip();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [openLine, closeTip]);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const doCopy = useCallback(async () => {
    let ok = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(snippet);
        ok = true;
      } else {
        ok = fallbackCopy(snippet);
      }
    } catch {
      ok = fallbackCopy(snippet);
    }
    if (ok) {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [snippet]);

  const toggleReveal = () => {
    setOpen((v) => {
      if (v) closeTip(); // collapsing hides the anchor — dismiss any popover
      return !v;
    });
  };

  const onRootKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && openLine != null) {
      e.stopPropagation();
      closeTip();
    }
  };

  const renderSegs = (line: CodeLine) =>
    line.length
      ? line.map((seg, si) =>
          seg.kind === "brace"
            ? <span key={si} className={`cv-b cv-b${seg.depth}`}>{seg.value}</span>
            : <span key={si}>{seg.value}</span>,
        )
      : "​"; // zero-width space keeps empty lines at full line-height

  return (
    <figure
      className="cv"
      data-track={track}
      /* Prose artifacts (a memo, a decision register) get a reading measure and
         no monospace-code framing — they are documents, not programs. */
      data-prose={isProse ? "" : undefined}
      /* `text` gets the reading typography but keeps its own alignment: these are
         hand-aligned tables, so reflowing them destroys the artifact. */
      data-pre={isPre ? "" : undefined}
      data-lang={(lang || "").toLowerCase() || undefined}
      data-collapsed={collapsible && !open ? "" : undefined}
      data-capped={capped && !uncapped ? "" : undefined}
      ref={rootRef}
      onKeyDown={onRootKeyDown}
    >
      <div className="cv-head">
        {lang && <span className="cv-lang mono">{lang}</span>}
        {caption && <figcaption className="cv-caption dim">{t(caption, locale)}</figcaption>}
        <span className="cv-head-spacer" />
        {collapsible && (
          <button
            type="button"
            className="cv-reveal"
            aria-expanded={open}
            aria-controls={`${baseId}-body`}
            onClick={toggleReveal}
          >
            <span className="cv-reveal-ico" aria-hidden="true">▸</span>
            <span className="cv-reveal-txt">{m(open ? "code.hide" : "code.show", locale)}</span>
            <span className="cv-reveal-meta mono">{lineCount} {m("code.lines", locale)}</span>
          </button>
        )}
        <button type="button" className="cv-copy" data-copied={copied ? "" : undefined} onClick={doCopy}>
          <span aria-hidden="true" className="cv-copy-ico">{copied ? "✓" : "⧉"}</span>
          {m(copied ? "code.copied" : "code.copy", locale)}
        </button>
      </div>
      <div className="cv-scroll" id={`${baseId}-body`} hidden={collapsible && !open}>
        <pre className="cv-body mono"><code>
          {(proseGroups ?? lines.map((_, i) => [i])).map((group, gi) => {
            // A prose paragraph is several source lines shown as one flowing
            // block; code (and structural markdown) is one line per group. Both
            // paths keep per-source-line annotations, so the fold, the copy
            // button and the annotation indices are unaffected by the grouping.
            if (group.length > 1) {
              // ONE state object for the whole paragraph: emphasis that opens on
              // one source line and closes on the next has to survive the join.
              const mdState: MdState = freshState();
              return (
                <span key={`g${gi}`} className="cv-ln cv-para">
                  {group.map((idx, k) => {
                    const note = annoMap.get(idx + 1);
                    const text = (k ? " " : "") + rawLines[idx].trim();
                    const body = isProse ? renderMd(tokenizeInline(text, mdState), `g${gi}l${idx}`) : text;
                    if (!note) return <span key={idx}>{body}</span>;
                    const tipId = `${baseId}-tip-${idx + 1}`;
                    const isOpen = openLine === idx + 1;
                    return (
                      <span key={idx} className="cv-ln-anno cv-inline-anno" data-open={isOpen ? "" : undefined}>
                        {/* A <button> is forced to inline-block by the UA, which
                            makes it an unbreakable box mid-paragraph and splits
                            the sentence across three lines. Inside flowing prose
                            the affordance has to be a real inline element, so it
                            is a focusable span with the button role — same
                            keyboard and screen-reader contract, no line break. */}
                        <span
                          role="button"
                          tabIndex={0}
                          className="cv-anno"
                          aria-describedby={isOpen ? tipId : undefined}
                          aria-expanded={isOpen}
                          onMouseEnter={() => setOpenLine(idx + 1)}
                          onMouseLeave={() => { if (focusedLine.current !== idx + 1) closeTip(); }}
                          onFocus={() => {
                            focusedLine.current = idx + 1;
                            setOpenLine(idx + 1);
                            if (capped) setUncapped(true);   // same reason as below
                          }}
                          onBlur={() => { focusedLine.current = null; closeTip(); }}
                          onClick={() => setOpenLine(idx + 1)}
                          onKeyDown={(e) => {
                            // A span with role=button does not get Enter/Space for free.
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setOpenLine(isOpen ? null : idx + 1);
                            }
                          }}
                        >
                          {body}
                        </span>
                        {isOpen && (
                          <span role="tooltip" id={tipId} className="cv-tip is-open">{t(note, locale)}</span>
                        )}
                      </span>
                    );
                  })}
                </span>
              );
            }
            const idx = group[0];
            const line = lines[idx] ?? [];
            const lineNo = idx + 1;
            const note = annoMap.get(lineNo);
            // A standalone prose line is a heading, a list item, a table row or a
            // blank. It keeps its markers as structure but still gets inline
            // emphasis, and a heading gets its level so it can read as one.
            const hLevel = isProse ? headingLevel(rawLines[idx] ?? "") : 0;
            const lnClass = ["cv-ln", diffClasses?.[idx], hLevel ? `cv-h${hLevel}` : null]
              .filter(Boolean).join(" ");
            // With the heading STYLED as a heading, the leading `#` markers are
            // redundant decoration, so they come off. List and table markers stay:
            // they carry meaning we are not re-rendering (a bullet, a column).
            //
            // A diff of prose gets the same inline markdown: these hunks are memos
            // and RFC comments, so they carry **bold** exactly like the markdown
            // artifacts do, and leaving it raw showed literal asterisks on 13
            // lines. The leading +/- is sliced off, rendered, and put back — it is
            // the diff's meaning and must not go through the tokenizer.
            let content: React.ReactNode[] | React.ReactNode;
            if (isProse) {
              const raw = rawLines[idx] ?? "";
              content = renderMd(tokenizeLine(hLevel ? raw.trim().slice(hLevel + 1) : raw), `s${idx}`);
            } else if (isDiff) {
              // Pre-tokenized with state carried BETWEEN lines of the same side.
              // Calling tokenizeLine() per line reset the state, so a `**…**` or a
              // `` `…` `` span wrapped across a source line rendered the wrong half
              // — one closing backtick opened a new code span that swallowed 60
              // characters of prose, and two diagnosis sentences lost their bold on
              // the concept whose lesson is that those sentences are load-bearing.
              content = [diffTokens[idx].marker, ...renderMd(diffTokens[idx].tokens, `d${idx}`)];
            } else {
              content = renderSegs(line);
            }
            if (!note) {
              return (
                <span key={idx} className={lnClass}>
                  {isProse && !(rawLines[idx] ?? "").trim() ? "​" : content}
                </span>
              );
            }
            const tipId = `${baseId}-tip-${lineNo}`;
            const isOpen = openLine === lineNo;
            return (
              <span key={idx} className={`${lnClass} cv-ln-anno`} data-open={isOpen ? "" : undefined}>
                <button
                  type="button"
                  className="cv-anno"
                  aria-describedby={isOpen ? tipId : undefined}
                  aria-expanded={isOpen}
                  onMouseEnter={() => setOpenLine(lineNo)}
                  onMouseLeave={() => { if (focusedLine.current !== lineNo) closeTip(); }}
                  onFocus={() => {
                    focusedLine.current = lineNo;
                    setOpenLine(lineNo);
                    // Tabbing to a line below the cap made the browser scroll a
                    // container with `overflow-y: hidden` — no scrollbar, so no
                    // wheel, touch or Home key could bring it back, and the
                    // artifact stayed stuck mid-way. Uncapping on focus means the
                    // keyboard path reveals what it navigates to instead.
                    if (capped) setUncapped(true);
                  }}
                  onBlur={() => { focusedLine.current = null; closeTip(); }}
                  onClick={() => setOpenLine(lineNo)}
                >
                  {content}
                </button>
                {isOpen && (
                  <span role="tooltip" id={tipId} className="cv-tip is-open">
                    {t(note, locale)}
                  </span>
                )}
              </span>
            );
          })}
        </code></pre>
      </div>

      {capped && (
        /* Below the body, not in the head: this control belongs next to the fade
           it removes, and the head already carries language, caption and copy. */
        <button
          type="button"
          className="cv-expand"
          aria-expanded={uncapped}
          aria-controls={`${baseId}-body`}
          onClick={() => setUncapped((v) => !v)}
        >
          <span className="cv-expand-ico" aria-hidden="true">{uncapped ? "▴" : "▾"}</span>
          <span>{m(uncapped ? "code.collapseHeight" : "code.expandHeight", locale)}</span>
          <span className="cv-reveal-meta mono">{lineCount} {m("code.lines", locale)}</span>
        </button>
      )}

      {hasAnnotations && (
        <p className="cv-anno-hint dim">{m("code.annotationsHint", locale)}</p>
      )}
    </figure>
  );
}

export default CodeView;
