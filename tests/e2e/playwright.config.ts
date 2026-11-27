import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env["CI"]);

/**
 * End-to-end tests: the product spec, checked against the running system.
 * They talk to apps only through their public surface (HTTP, browser).
 */
export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Apps that must be running are started here once they exist, e.g.
  // webServer: [{ command: "pnpm --filter <app> start", url: "..." }],
});
