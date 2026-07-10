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

const REVEAL_LINES = 12; // snippets with <= this many lines render open

// ── rainbow-brace tokenizer ────────────────────────────────────────────────
// Walks the source char-by-char tracking string / comment state so we only
// colour STRUCTURAL brackets. Comment/string syntax is approximated per
// language family — good enough for short teaching snippets, and never throws.
type Seg = { kind: "text"; value: string } | { kind: "brace"; value: string; depth: number };
type CodeLine = Seg[];

function tokenizeLines(src: string, lang: string): CodeLine[] {
  const l = (lang || "").toLowerCase();
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
  code, locale, track,
}: {
  code: ConceptCode;
  locale: Locale;
  track: "general" | "ai";
}) {
  const { lang, snippet, caption, annotations } = code;

  const lines = useMemo(() => tokenizeLines(snippet, lang), [snippet, lang]);
  const lineCount = lines.length;
  const annoMap = useMemo(() => {
    const map = new Map<number, I18nText>();
    (annotations ?? []).forEach((a) => map.set(a.line, a.note));
    return map;
  }, [annotations]);
  const hasAnnotations = annoMap.size > 0;

  const collapsible = lineCount > REVEAL_LINES;
  const [open, setOpen] = useState(!collapsible); // deterministic on SSR + client
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
      data-collapsed={collapsible && !open ? "" : undefined}
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
          {lines.map((line, idx) => {
            const lineNo = idx + 1;
            const note = annoMap.get(lineNo);
            if (!note) {
              return <span key={idx} className="cv-ln">{renderSegs(line)}</span>;
            }
            const tipId = `${baseId}-tip-${lineNo}`;
            const isOpen = openLine === lineNo;
            return (
              <span key={idx} className="cv-ln cv-ln-anno" data-open={isOpen ? "" : undefined}>
                <button
                  type="button"
                  className="cv-anno"
                  aria-describedby={isOpen ? tipId : undefined}
                  aria-expanded={isOpen}
                  onMouseEnter={() => setOpenLine(lineNo)}
                  onMouseLeave={() => { if (focusedLine.current !== lineNo) closeTip(); }}
                  onFocus={() => { focusedLine.current = lineNo; setOpenLine(lineNo); }}
                  onBlur={() => { focusedLine.current = null; closeTip(); }}
                  onClick={() => setOpenLine(lineNo)}
                >
                  {renderSegs(line)}
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

      {hasAnnotations && (
        <p className="cv-anno-hint dim">{m("code.annotationsHint", locale)}</p>
      )}
    </figure>
  );
}

export default CodeView;
