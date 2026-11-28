import base from "@repo/config/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

// Unit and property tests for the modules behind the pages. They run in
// Node: the modules take storage and fetch as parameters. The pages
// themselves are checked by the E2E tests (specs/product/web.md).
export default mergeConfig(base, defineConfig({}));
