import { createConfig } from "@repo/config/eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

// The shared rules, plus browser globals and the React hooks rules for the
// code that runs in the page.
export default [
  ...createConfig({ rootDir: import.meta.dirname }),
  reactHooks.configs.flat["recommended-latest"],
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },
];
