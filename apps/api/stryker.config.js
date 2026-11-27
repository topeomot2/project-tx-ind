import base from "@repo/config/stryker";

// server.ts only wires things together; db.ts is covered by integration
// tests, which mutation runs skip (they need Docker).
export default {
  ...base,
  mutate: ["src/**/*.ts", "!src/**/*.test.ts", "!src/server.ts", "!src/db.ts"],
};
