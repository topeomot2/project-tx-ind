import type { ViteUserConfig } from "vitest/config";

/**
 * Shared Vitest settings. A package merges this into its own config:
 *
 *   import { defineConfig, mergeConfig } from "vitest/config";
 *   import base from "@repo/config/vitest";
 *   export default mergeConfig(base, defineConfig({ ... }));
 *
 * Unit and property tests sit next to the code they test:
 *   src/foo.ts  ->  src/foo.test.ts           (examples)
 *               ->  src/foo.property.test.ts  (fast-check properties)
 * End-to-end tests live in tests/e2e and run with Playwright, not Vitest.
 */
const config: ViteUserConfig = {
  test: {
    include: ["src/**/*.test.{ts,js}"],
    // Each test starts with clean mocks, so tests cannot leak into each other.
    restoreMocks: true,
    // Fail on test.only left behind in CI.
    allowOnly: !process.env["CI"],
  },
};

export default config;
