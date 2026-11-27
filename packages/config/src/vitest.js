/**
 * Shared Vitest settings. A package merges this into its own config:
 *
 *   import { defineConfig, mergeConfig } from "vitest/config";
 *   import base from "@repo/config/vitest";
 *   export default mergeConfig(base, defineConfig({ ... }));
 *
 * @type {import("vitest/config").ViteUserConfig}
 */
const config = {
  test: {
    include: ["src/**/*.test.{ts,js}", "src/**/*.property.test.{ts,js}"],
    restoreMocks: true,
  },
};

export default config;
