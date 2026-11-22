// Runs a learner's Python function against test cases inside Pyodide. Shared by the browser
// worker (public/py/worker.mjs) and the content gate (tools/check-problems.mjs), so a reference
// solution is checked by exactly the code that will grade the learner.
export const HARNESS = String.raw`
import json, time, copy, traceback, io, contextlib, math

def __norm(x):
    return json.loads(json.dumps(x, default=lambda v: sorted(v, key=repr) if isinstance(v, (set, frozenset)) else list(v)))

def __key(v):
    return json.dumps(v, sort_keys=True)

def __eq(got, exp, mode):
    try:
        g = __norm(got)
    except Exception:
        return False
    if mode == "float":
        return isinstance(g, (int, float)) and not isinstance(g, bool) and math.isclose(g, exp, rel_tol=1e-6, abs_tol=1e-6)
    if mode in ("unordered", "unordered-nested") and isinstance(g, list) and isinstance(exp, list):
        if mode == "unordered-nested":
            g = [sorted(x, key=__key) if isinstance(x, list) else x for x in g]
            exp = [sorted(x, key=__key) if isinstance(x, list) else x for x in exp]
        return sorted(map(__key, g)) == sorted(map(__key, exp))
    return g == exp

def __where(tb):
    frames = [f for f in traceback.extract_tb(tb) if f.filename == "solution.py"]
    return f" (line {frames[-1].lineno})" if frames else ""

def __run(payload_json):
    p = json.loads(payload_json)
    ns = {"__name__": "solution"}
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            exec(compile(p["code"], "solution.py", "exec"), ns)
    except SyntaxError as e:
        return json.dumps({"error": f"SyntaxError: {e.msg} (line {e.lineno})"})
    except Exception as e:
        return json.dumps({"error": f"{type(e).__name__}: {e}{__where(e.__traceback__)}"})
    f = ns.get(p["fn"])
    if not callable(f):
        return json.dumps({"error": f"Define a function named {p['fn']}"})
    results = []
    for t in p["tests"]:
        args = copy.deepcopy(t["args"])
        err, got = None, None
        t0 = time.perf_counter()
        try:
            with contextlib.redirect_stdout(out):
                got = f(*args)
        except Exception as e:
            err = f"{type(e).__name__}: {e}{__where(e.__traceback__)}"
        ms = (time.perf_counter() - t0) * 1000
        try:
            shown = __norm(got)
        except Exception:
            shown = repr(got)
        results.append({"ok": err is None and __eq(got, t["expected"], p.get("compare", "exact")), "got": shown, "error": err, "ms": round(ms, 2)})
    return json.dumps({"results": results, "stdout": out.getvalue()[-2000:]})
`;

/** payload: { code, fn, tests: [{ args, expected }], compare } → { results } | { error } */
export async function runTests(pyodide, payload) {
  pyodide.runPython(HARNESS);
  pyodide.globals.set("__payload", JSON.stringify(payload));
  return JSON.parse(pyodide.runPython("__run(__payload)"));
}
