"use client";
// Write a Python function, run it against the problem's tests in the browser. Python (Pyodide,
// self-hosted) runs in a module Web Worker; the page enforces the time limit by terminating it,
// so an infinite loop never freezes the tab. Drafts and solved marks live in localStorage.
// A problem with `perf` adds one large, timed input once the tests pass (an online judge's time
// limit): correct but too slow is not solved.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { addActivity, loadState, saveState } from "@/lib/practice/store";
import { loadCode, saveCode } from "@/lib/practice/code-store";

type Test = { args: unknown[]; expected: unknown; visible?: boolean };
type Result = { ok: boolean; got: unknown; error: string | null; ms: number };
type Outcome = { results?: Result[]; error?: string; stdout?: string };
export type Perf = { gen: string; sha: string; limitMs: number; size: string };
type PerfOut = { ok: boolean; ms: number | null; right: boolean; fast: boolean; error: string | null };

const T = {
  en: { run: "Run tests", running: "Running…", loading: "Loading Python (~13 MB, first time only)…", reset: "Reset", passed: "All tests pass", partly: (n: number, t: number) => `${n}/${t} tests pass`,
    hidden: "Hidden test", input: "Input", expected: "Expected", got: "Got", timeout: "Time limit exceeded (5 s): an infinite loop, or a solution too slow for one of the tests.", stdout: "Printed output",
    xp: "+20 XP · marked solved", next: "Next problem", tip: "Ctrl/⌘ + Enter runs · Tab indents", failed: "Python could not start in this browser.", solvedBefore: "Solved before", noPaste: "Manual mode: type it yourself, pasting is off here.",
    perf: "Large input", perfRunning: "Timing the large input…", limit: (ms: number) => `limit ${ms} ms`,
    slow: "Correct on the small tests, but too slow at scale: look for a better complexity (the reference takes a few ms).",
    wrong: "Fast, but a wrong answer on the large input: an edge case that only shows at scale.",
    perfTimeout: (s: number) => `Over ${s} s on the large input: far too slow (or stuck).`, tooSlow: "All tests pass, but too slow on the large input" },
  es: { run: "Ejecutar tests", running: "Ejecutando…", loading: "Cargando Python (~13 MB, solo la primera vez)…", reset: "Reiniciar", passed: "Pasan todos los tests", partly: (n: number, t: number) => `Pasan ${n}/${t} tests`,
    hidden: "Test oculto", input: "Entrada", expected: "Esperado", got: "Obtenido", timeout: "Límite de tiempo excedido (5 s): un loop infinito, o una solución demasiado lenta para alguno de los tests.", stdout: "Salida impresa",
    xp: "+20 XP · marcado como resuelto", next: "Siguiente problema", tip: "Ctrl/⌘ + Enter ejecuta · Tab indenta", failed: "Python no pudo iniciar en este navegador.", solvedBefore: "Ya lo resolviste", noPaste: "Modo manual: escríbelo tú, pegar está desactivado aquí.",
    perf: "Entrada grande", perfRunning: "Midiendo la entrada grande…", limit: (ms: number) => `límite ${ms} ms`,
    slow: "Correcto en los tests chicos, pero demasiado lento a escala: busca una mejor complejidad (la referencia tarda pocos ms).",
    wrong: "Rápido, pero da una respuesta incorrecta con la entrada grande: un caso borde que solo aparece a escala.",
    perfTimeout: (s: number) => `Más de ${s} s con la entrada grande: demasiado lento (o se quedó pegado).`, tooSlow: "Pasan todos los tests, pero es lento con la entrada grande" },
};

const show = (v: unknown) => JSON.stringify(v);

// One Python worker for the whole page: every runner on it (the mock interview mounts two) shares
// the ~13 MB runtime. It is terminated on a timeout and when the last runner unmounts.
let shared: { w: Worker; ready: Promise<void> } | null = null;
let seq = 0;
let users = 0;
function rpc(w: Worker, type: string, payload?: unknown, timeoutMs?: number) {
  return new Promise<Outcome>((resolve, reject) => {
    const n = ++seq;
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
}
function killWorker() { shared?.w.terminate(); shared = null; }
function bootWorker() {
  if (!shared) {
    const w = new Worker("/py/worker.mjs", { type: "module" });
    shared = { w, ready: rpc(w, "warm").then(() => undefined) };
  }
  return shared;
}

export function CodeRunner({ id, fn, starter, tests, compare, concept, nextId, locale, draftId = id, onResult, noPaste, perf }: {
  id: string; fn: string; starter: string; tests: Test[]; compare: string; concept: string; nextId?: string; locale: Locale;
  /** One large, timed input, run after the tests pass. */
  perf?: Perf;
  /** Where the draft is kept: the mock uses its own key so an old solution is not pre-filled. */
  draftId?: string;
  onResult?: (passed: number, total: number) => void;
  /** The Gym's manual mode: pasting does nothing (and says why). */
  noPaste?: boolean;
}) {
  const t = T[locale];
  const [code, setCode] = useState(starter);
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "perf">("idle");
  const [out, setOut] = useState<Outcome | null>(null);
  const [perfOut, setPerfOut] = useState<PerfOut | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [solvedAt, setSolvedAt] = useState<number | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const s = loadCode();
    if (s.drafts[draftId]) setCode(s.drafts[draftId]);
    setSolvedAt(s.solved[id] ?? null);
  }, [id, draftId]);
  useEffect(() => { users++; return () => { if (--users === 0) killWorker(); }; }, []);

  const boot = useCallback(() => bootWorker().ready, []);

  const run = async () => {
    if (status !== "idle") return;
    setNotice(null);
    setStatus("loading");
    try { await boot(); } catch { setStatus("idle"); setNotice(t.failed); killWorker(); return; }
    setStatus("running");
    setPerfOut(null);
    try {
      const res = await rpc(bootWorker().w, "run", { code, fn, tests, compare }, 5000);
      setOut(res);
      const testsOk = !!res.results?.length && res.results.every((r) => r.ok);
      let perfOk = !perf;
      if (testsOk && perf) {
        setStatus("perf");
        const cap = Math.max(3000, perf.limitMs * 15);
        try {
          const pr = await rpc(bootWorker().w, "perf", { code, fn, compare, perf: { gen: perf.gen, sha: perf.sha, limitMs: perf.limitMs } }, cap) as unknown as PerfOut;
          setPerfOut(pr);
          perfOk = pr.ok;
        } catch (e) {
          // Far over the limit: stop it like any runaway run, and say so.
          if ((e as Error).message !== "timeout") throw e;
          killWorker();
          setPerfOut({ ok: false, ms: null, right: false, fast: false, error: t.perfTimeout(Math.round(cap / 1000)) });
        }
      }
      const all = testsOk && perfOk;
      if (res.results) onResult?.(res.results.filter((r) => r.ok).length + (perf && perfOk && testsOk ? 1 : 0), res.results.length + (perf ? 1 : 0));
      if (all && !solvedAt) {
        const s = loadCode(); s.solved[id] = Date.now(); saveCode(s); setSolvedAt(s.solved[id]);
        const st = loadState(); addActivity(st, new Date(), 20, true); st.read[concept] ??= Date.now(); saveState(st);
        setNotice(t.xp);
      }
    } catch (e) {
      // A run that never answers is an infinite loop (or a huge input): kill the worker, start fresh next time.
      if ((e as Error).message === "timeout") { killWorker(); setNotice(t.timeout); setOut(null); }
      else setOut({ error: (e as Error).message });
    }
    setStatus("idle");
  };

  const edit = (v: string) => {
    setCode(v);
    const s = loadCode(); s.drafts[draftId] = v; saveCode(s);
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
          onPaste={noPaste ? (e) => { e.preventDefault(); setNotice(t.noPaste); } : undefined}
          spellCheck={false} autoCapitalize="off" autoComplete="off" autoCorrect="off" aria-label="Python" rows={Math.max(12, code.split("\n").length + 2)} />
      </div>
      <div className="cr-actions">
        <button type="button" className="btn btn-primary" onClick={() => void run()} disabled={status !== "idle"}>
          {status === "loading" ? t.loading : status === "running" ? t.running : status === "perf" ? t.perfRunning : t.run}
        </button>
        <button type="button" className="btn" onClick={() => { edit(starter); setOut(null); }}>{t.reset}</button>
        <span className="cr-tip">{t.tip}</span>
        {solvedAt && <span className="cr-solved">✓ {t.solvedBefore}</span>}
      </div>
      <div aria-live="polite">
        {notice && <p className="cr-notice">{notice}</p>}
        {out?.error && <pre className="cr-error">{out.error}</pre>}
        {results.length > 0 && (passed < results.length
          ? <div className="cr-summary bad">{t.partly(passed, results.length)}</div>
          : perfOut && !perfOut.ok ? <div className="cr-summary bad">{t.tooSlow}</div>
          : status === "perf" ? null
          : <div className="cr-summary ok">✓ {t.passed}</div>)}
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
      {perf && perfOut && (
        <div className={`cr-perf ${perfOut.ok ? "ok" : "bad"}`}>
          <span className="cr-mark">{perfOut.ok ? "✓" : "✗"}</span>
          <span><strong>⚡ {t.perf}</strong> · {perf.size}{!perfOut.ok && <small>{perfOut.error ?? (!perfOut.right ? t.wrong : t.slow)}</small>}</span>
          <span className="cr-ms">{perfOut.ms !== null ? `${perfOut.ms.toFixed(1)} ms · ` : ""}{t.limit(perf.limitMs)}</span>
        </div>
      )}
      {out?.stdout && <details className="cr-stdout"><summary>{t.stdout}</summary><pre>{out.stdout}</pre></details>}
      {passed === results.length && results.length > 0 && (!perf || perfOut?.ok) && nextId && (
        <Link className="btn" href={`/${locale}/practice/code/${nextId}/`}>{t.next} →</Link>
      )}
    </div>
  );
}
