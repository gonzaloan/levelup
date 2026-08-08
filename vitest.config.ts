import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    /**
     * `trace-gate.test.ts` runs the real gate, and the only honest way to prove a
     * gate catches an invented figure is to inject one into the shipped file and run
     * the gate against it — so it WRITES `src/content/data/lessons.json` and restores
     * it in a `finally`. Six other test files read that same 3.4MB file, and
     * `tools/glossary-scan.cjs` `JSON.parse`s it, so in parallel a reader could land
     * mid-write and die on "Unterminated string in JSON at position 3161698".
     *
     * That made `npm run verify` flaky rather than wrong: measured 1 failure in 8
     * runs, in `glossary.test.ts`, which touches none of the code under change. A
     * gate that fails once in eight for a reason unrelated to the diff trains people
     * to re-run it until it passes, which is the same damage as a gate that fires on
     * correct content.
     *
     * `fileParallelism: false` is the small hammer: the suite is 2.3s of actual test
     * time, so serialising costs almost nothing and removes the whole class. The
     * alternative — giving the writer a temp copy — would stop it testing the real
     * shipped file, which is the property that makes it worth having.
     */
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
