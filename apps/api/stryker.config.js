import base from "@repo/config/stryker";

// src/testing/ holds test fakes, not product code.
// server.ts only wires things together; db.ts is covered by integration
// tests, which mutation runs skip (they need Docker).
export default {
  ...base,
  mutate: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/testing/**",
    "!src/server.ts",
    "!src/db.ts",
  ],
};
