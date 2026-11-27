import base from "@repo/config/stryker";

// The CLIs only do I/O; their logic is in the tested modules.
export default {
  ...base,
  mutate: ["src/**/*.ts", "!src/**/*.test.ts", "!src/cli/**"],
};
