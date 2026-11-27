import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import playwright from "eslint-plugin-playwright";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint setup: typescript-eslint "strict type-checked" rules for
 * both TS and JS files, with Prettier owning all formatting.
 * Tests may not be focused (.only) or skipped (.skip, .todo, xit).
 *
 * @param {{ rootDir: string }} options rootDir is the package folder
 *   (pass `import.meta.dirname`), so type info comes from its tsconfig.
 */
export function createConfig({ rootDir }) {
  return defineConfig(
    { ignores: ["dist/**", "coverage/**", ".turbo/**", "reports/**"] },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        globals: globals.node,
        parserOptions: {
          // eslint.config.js gets type info even in a TS-only package.
          // TS config files (vitest.config.ts...) go in the package tsconfig.
          projectService: { allowDefaultProject: ["*.config.js"] },
          tsconfigRootDir: rootDir,
        },
      },
    },
    {
      files: ["**/*.test.{ts,js}"],
      plugins: { vitest },
      rules: {
        "vitest/no-focused-tests": "error",
        "vitest/no-disabled-tests": "error",
        // A test.todo is a requirement without a test: not allowed either.
        "vitest/warn-todo": "error",
      },
    },
    {
      files: ["**/*.spec.{ts,js}"],
      plugins: { playwright },
      rules: {
        "playwright/no-focused-test": "error",
        "playwright/no-skipped-test": "error",
      },
    },
    prettier,
  );
}
