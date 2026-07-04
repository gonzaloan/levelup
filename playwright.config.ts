import { defineConfig, devices } from "@playwright/test";

// Serves the static export and drives key screens in EN + ES.
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4180",
    trace: "off",
    screenshot: "only-on-failure",
    // Freeze the ambient starfield + all motion so screenshots settle
    // deterministically — and so we exercise the reduced-motion a11y path.
    reducedMotion: "reduce",
  },
  webServer: {
    command: "npx --yes serve out -l 4180 --no-port-switching",
    url: "http://localhost:4180/en/",
    timeout: 60_000,
    reuseExistingServer: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
