/**
 * Shared Stryker (mutation testing) settings. A package's
 * stryker.config.js spreads this and sets `mutate`:
 *
 *   import base from "@repo/config/stryker";
 *   export default { ...base, mutate: ["src/**\/*.ts", "!src/**\/*.test.ts"] };
 *
 * Report-only for now: `break` is null, so a low score never fails a run.
 *
 * @type {import("@stryker-mutator/api/core").PartialStrykerOptions}
 */
const config = {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { configFile: "vitest.config.ts" },
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  thresholds: { high: 80, low: 60, break: null },
  tempDirName: ".stryker-tmp",
};

export default config;
