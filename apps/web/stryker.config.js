import base from "@repo/config/stryker";

// Only the specced modules: the pages are covered by E2E tests, which
// mutation runs skip.
export default {
  ...base,
  mutate: ["src/client.ts", "src/session.ts", "src/forms.ts"],
};
