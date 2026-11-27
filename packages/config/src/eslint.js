import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint setup: typescript-eslint "strict type-checked" rules for
 * both TS and JS files, with Prettier owning all formatting.
 *
 * @param {{ rootDir: string }} options rootDir is the package folder
 *   (pass `import.meta.dirname`), so type info comes from its tsconfig.
 */
export function createConfig({ rootDir }) {
  return defineConfig(
    { ignores: ["dist/**", "coverage/**", ".turbo/**"] },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        globals: globals.node,
        parserOptions: {
          projectService: true,
          tsconfigRootDir: rootDir,
        },
      },
    },
    prettier,
  );
}
