import base from "@repo/config/stryker";

export default { ...base, mutate: ["src/**/*.ts", "!src/**/*.test.ts"] };
