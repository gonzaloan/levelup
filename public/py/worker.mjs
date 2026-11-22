// Python in a Web Worker: the page stays responsive, and an infinite loop is stopped by
// terminating the worker (the page owns the time limit). Pyodide is served from our own origin.
import { loadPyodide } from "/pyodide/pyodide.mjs";
import { runTests } from "./runner.mjs";

let ready = null;
self.onmessage = async (e) => {
  const { id, type, payload } = e.data;
  try {
    ready ??= loadPyodide({ indexURL: "/pyodide/" });
    const py = await ready;
    if (type === "warm") return self.postMessage({ id, ok: true });
    self.postMessage({ id, ok: true, result: await runTests(py, payload) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err?.message ?? err) });
  }
};
