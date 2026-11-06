import { defineConfig, devices } from "@playwright/test";

// Serves the static export (`npm run build` first) and drives the key screens.
export default defineConfig({
  testDir: "./tests/e2e",
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4180",
    trace: "off",
    screenshot: "only-on-failure",
    // CHROMIUM_PATH lets a machine with a different preinstalled Chromium run the suite.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: "npx --yes serve out -l 4180 --no-port-switching",
    url: "http://localhost:4180/es/",
    timeout: 60_000,
    reuseExistingServer: true,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
