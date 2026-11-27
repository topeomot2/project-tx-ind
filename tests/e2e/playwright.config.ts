import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env["CI"]);
const apiURL = process.env["E2E_API_URL"] ?? "http://localhost:3000";

/**
 * End-to-end tests: the product spec, checked against the running system.
 * They talk to apps only through their interface (HTTP, browser).
 */
export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: apiURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Start every app the tests need. Locally an already-running dev server
  // is reused; in CI each run starts fresh.
  webServer: [
    {
      command: "pnpm --filter @repo/api start",
      // Ready, not just alive: the api can reach its database.
      url: `${apiURL}/ready`,
      reuseExistingServer: !isCI,
    },
  ],
});
