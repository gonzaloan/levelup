"use client";
// Write a Python function, run it against the problem's tests in the browser. Python (Pyodide,
// self-hosted) runs in a module Web Worker; the page enforces the time limit by terminating it,
// so an infinite loop never freezes the tab. Drafts and solved marks live in localStorage.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { addActivity, loadState, saveState } from "@/lib/practice/store";

type Test = { args: unknown[]; expected: unknown; visible?: boolean };
type Result = { ok: boolean; got: unknown; error: string | null; ms: number };
type Outcome = { results?: Result[]; error?: string; stdout?: string };

const KEY = "fg.code.v1";
type Saved = { solved: Record<string, number>; drafts: Record<string, string> };
export function loadCode(): Saved {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (s?.solved) return { solved: s.solved, drafts: s.drafts ?? {} }; } catch { /* ignore */ }
  return { solved: {}, drafts: {} };
}
function saveCode(s: Saved) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }

const T = {
  en: { run: "Run tests", running: "Running…", loading: "Loading Python (~13 MB, first time only)…", reset: "Reset", passed: "All tests pass", partly: (n: number, t: number) => `${n}/${t} tests pass`,
    hidden: "Hidden test", input: "Input", expected: "Expected", got: "Got", timeout: "Time limit exceeded (5 s): look for an infinite loop.", stdout: "Printed output",
    xp: "+20 XP · marked solved", next: "Next problem", tip: "Ctrl/⌘ + Enter runs · Tab indents", failed: "Python could not start in this browser.", solvedBefore: "Solved before" },
  es: { run: "Ejecutar tests", running: "Ejecutando…", loading: "Cargando Python (~13 MB, solo la primera vez)…", reset: "Reiniciar", passed: "Pasan todos los tests", partly: (n: number, t: number) => `Pasan ${n}/${t} tests`,
    hidden: "Test oculto", input: "Entrada", expected: "Esperado", got: "Obtenido", timeout: "Límite de tiempo excedido (5 s): busca un loop infinito.", stdout: "Salida impresa",
    xp: "+20 XP · marcado como resuelto", next: "Siguiente problema", tip: "Ctrl/⌘ + Enter ejecuta · Tab indenta", failed: "Python no pudo iniciar en este navegador.", solvedBefore: "Ya lo resolviste" },
};

const show = (v: unknown) => JSON.stringify(v);

export function CodeRunner({ id, fn, starter, tests, compare, concept, nextId, locale }: {
  id: string; fn: string; starter: string; tests: Test[]; compare: string; concept: string; nextId?: string; locale: Locale;
}) {
  const t = T[locale];
  const [code, setCode] = useState(starter);
  const [status, setStatus] = useState<"idle" | "loading" | "running">("idle");
  const [out, setOut] = useState<Outcome | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [solvedAt, setSolvedAt] = useState<number | null>(null);
  const worker = useRef<Worker | null>(null);
  const ready = useRef<Promise<void> | null>(null);
  const seq = useRef(0);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const s = loadCode();
    if (s.drafts[id]) setCode(s.drafts[id]);
    setSolvedAt(s.solved[id] ?? null);
    return () => worker.current?.terminate();
  }, [id]);

  const call = (type: string, payload?: unknown, timeoutMs?: number) => new Promise<Outcome>((resolve, reject) => {
    const w = worker.current!;
    const n = ++seq.current;
    const timer = timeoutMs ? setTimeout(() => reject(new Error("timeout")), timeoutMs) : undefined;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.id !== n) return;
      clearTimeout(timer);
      w.removeEventListener("message", onMsg);
      if (e.data.ok) resolve(e.data.result ?? {}); else reject(new Error(e.data.error));
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ id: n, type, payload });
  });

  const boot = useCallback(() => {
    if (!worker.current) {
      worker.current = new Worker("/py/worker.mjs", { type: "module" });
      ready.current = call("warm").then(() => undefined);
    }
    return ready.current!;
  }, []);

  const run = async () => {
    if (status !== "idle") return;
    setNotice(null);
    setStatus("loading");
    try { await boot(); } catch { setStatus("idle"); setNotice(t.failed); worker.current = null; return; }
    setStatus("running");
    try {
      const res = await call("run", { code, fn, tests, compare }, 5000);
      setOut(res);
      const all = !!res.results?.length && res.results.every((r) => r.ok);
      if (all && !solvedAt) {
        const s = loadCode(); s.solved[id] = Date.now(); saveCode(s); setSolvedAt(s.solved[id]);
        const st = loadState(); addActivity(st, new Date(), 20, true); st.read[concept] ??= Date.now(); saveState(st);
        setNotice(t.xp);
      }
    } catch (e) {
      // A run that never answers is an infinite loop (or a huge input): kill the worker, start fresh next time.
      if ((e as Error).message === "timeout") { worker.current?.terminate(); worker.current = null; setNotice(t.timeout); setOut(null); }
      else setOut({ error: (e as Error).message });
    }
    setStatus("idle");
  };

  const edit = (v: string) => {
    setCode(v);
    const s = loadCode(); s.drafts[id] = v; saveCode(s);
  };

  // A small editor: Tab/Shift+Tab indent by 4, Enter keeps the indent (and adds 4 after ":").
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const { selectionStart: a, selectionEnd: b, value } = ta;
    const put = (text: string, from: number, to: number, caret: number) => {
      const next = value.slice(0, from) + text + value.slice(to);
      edit(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = caret; });
    };
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void run(); return; }
    if (e.key === "Tab") {
      e.preventDefault();
      const lineStart = value.lastIndexOf("\n", a - 1) + 1;
      if (e.shiftKey) {
        const n = value.slice(lineStart, lineStart + 4).match(/^ */)![0].length;
        if (n) put("", lineStart, lineStart + n, Math.max(lineStart, a - n));
      } else put("    ", a, b, a + 4);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const lineStart = value.lastIndexOf("\n", a - 1) + 1;
      const line = value.slice(lineStart, a);
      const indent = line.match(/^ */)![0] + (line.trimEnd().endsWith(":") ? "    " : "");
      put("\n" + indent, a, b, a + 1 + indent.length);
    }
  };

  const results = out?.results ?? [];
  const passed = results.filter((r) => r.ok).length;
  const firstHiddenFail = results.findIndex((r, i) => !r.ok && !tests[i].visible);

  return (
    <div className="code-runner">
      <div className="cr-editor">
        <textarea ref={area} value={code} onChange={(e) => edit(e.target.value)} onKeyDown={onKey} onFocus={() => void boot().catch(() => undefined)}
          spellCheck={false} autoCapitalize="off" autoComplete="off" autoCorrect="off" aria-label="Python" rows={Math.max(12, code.split("\n").length + 2)} />
      </div>
      <div className="cr-actions">
        <button type="button" className="btn btn-primary" onClick={() => void run()} disabled={status !== "idle"}>
          {status === "loading" ? t.loading : status === "running" ? t.running : t.run}
        </button>
        <button type="button" className="btn" onClick={() => { edit(starter); setOut(null); }}>{t.reset}</button>
        <span className="cr-tip">{t.tip}</span>
        {solvedAt && <span className="cr-solved">✓ {t.solvedBefore}</span>}
      </div>
      <div aria-live="polite">
        {notice && <p className="cr-notice">{notice}</p>}
        {out?.error && <pre className="cr-error">{out.error}</pre>}
        {results.length > 0 && (
          <div className={`cr-summary ${passed === results.length ? "ok" : "bad"}`}>{passed === results.length ? `✓ ${t.passed}` : t.partly(passed, results.length)}</div>
        )}
      </div>
      {results.length > 0 && (
        <ol className="cr-results">
          {results.map((r, i) => {
            const tc = tests[i];
            const detail = tc.visible || i === firstHiddenFail;
            return (
              <li key={i} className={r.ok ? "ok" : "bad"}>
                <span className="cr-mark">{r.ok ? "✓" : "✗"}</span>
                {detail ? (
                  <span className="cr-case">
                    <code>{fn}({tc.args.map(show).join(", ")})</code>
                    {!r.ok && <span> → {t.expected} <code>{show(tc.expected)}</code>, {t.got} <code>{r.error ?? show(r.got)}</code></span>}
                  </span>
                ) : <span className="cr-case">{t.hidden} {i + 1}</span>}
                <span className="cr-ms">{r.ms.toFixed(1)} ms</span>
              </li>
            );
          })}
        </ol>
      )}
      {out?.stdout && <details className="cr-stdout"><summary>{t.stdout}</summary><pre>{out.stdout}</pre></details>}
      {passed === results.length && results.length > 0 && nextId && (
        <Link className="btn" href={`/${locale}/practice/code/${nextId}/`}>{t.next} →</Link>
      )}
    </div>
  );
}

/** "✓" next to a problem in lists, from this browser's solved marks. */
export function SolvedMark({ id }: { id: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(!!loadCode().solved[id]); }, [id]);
  return ok ? <span className="cr-solved-mark" title="✓">✓</span> : null;
}
