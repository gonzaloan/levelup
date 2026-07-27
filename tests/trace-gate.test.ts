import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Runs the traceability gate as part of the normal test suite.
//
// The gate exists because two review rounds found the same defect twelve times:
// an artifact whose figures were invented rather than taken from its concept's
// own authored example — and five of those reached the OPPOSITE conclusion to
// what the example teaches, so the two halves of one pane disagreed.
//
// It lives in a script (so it can report readable findings and be run alone) and
// is invoked here so it cannot quietly stop being run. A rule enforced only by
// remembering to run a tool is not enforced.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("artifact numbers trace to their concept", () => {
  it("no code artifact introduces a figure its concept never mentions", () => {
    let out = "";
    let failed = false;
    try {
      out = execFileSync("node", ["tools/check-trace.cjs"], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 600_000,
      });
    } catch (err) {
      failed = true;
      out = String((err as { stdout?: string }).stdout ?? err);
    }
    // The gate's own message names each offending artifact and value, so surface
    // it verbatim rather than restating it here.
    expect(failed ? out : "", out).toBe("");
    expect(out).toContain("every salient number traces");
  });
});
