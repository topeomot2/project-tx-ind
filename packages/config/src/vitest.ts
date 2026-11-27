import { configDefaults, type ViteUserConfig } from "vitest/config";

/**
 * Shared Vitest settings. A package merges this into its own config:
 *
 *   import { defineConfig, mergeConfig } from "vitest/config";
 *   import base from "@repo/config/vitest";
 *   export default mergeConfig(base, defineConfig({ ... }));
 *
 * Tests sit next to the code they test:
 *   src/foo.ts  ->  src/foo.test.ts              (unit: examples)
 *               ->  src/foo.property.test.ts     (property: fast-check)
 *               ->  src/foo.integration.test.ts  (integration: real services)
 * Unit and property tests run with `test`; integration tests need Docker and
 * run with `test:integration` (see `integration` below).
 * End-to-end tests live in tests/e2e and run with Playwright, not Vitest.
 */
const config: ViteUserConfig = {
  test: {
    include: ["src/**/*.test.{ts,js}"],
    exclude: [...configDefaults.exclude, "src/**/*.integration.test.{ts,js}"],
    // Each test starts with clean mocks, so tests cannot leak into each other.
    restoreMocks: true,
    // Fail on test.only left behind in CI.
    allowOnly: !process.env["CI"],
  },
};

export default config;

/** Settings for `vitest.integration.config.ts`: real services, slower. */
export const integration: ViteUserConfig = {
  test: {
    include: ["src/**/*.integration.test.{ts,js}"],
    restoreMocks: true,
    allowOnly: !process.env["CI"],
    // Starting a container takes seconds, not milliseconds.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
};
