// Every requirement in an approved spec has a test, and every test names a
// real requirement. Run: pnpm check:spec-ids
import { globSync } from "node:fs";
import { compareIds, idsFromSpec, idsFromTestSource } from "../spec-ids.ts";
import { readText, report, root } from "./shared.ts";

const specFiles = globSync("specs/**/*.md", {
  cwd: root,
  exclude: (path) => path.includes("_templates") || path.endsWith("README.md"),
});
const testFiles = globSync(
  [
    "apps/*/src/**/*.test.{ts,js}",
    "packages/*/src/**/*.test.{ts,js}",
    "tests/e2e/src/**/*.spec.{ts,js}",
  ],
  { cwd: root },
);

const approved = specFiles.flatMap((file) => {
  const spec = idsFromSpec(readText(file));
  return spec.status === "approved" ? spec.ids : [];
});
const tested = testFiles.flatMap((file) => idsFromTestSource(readText(file)));
const { untested, unknown } = compareIds(approved, tested);

report(
  "Specs and tests do not match",
  [
    ...untested.map((id) => `${id}: approved requirement with no test`),
    ...unknown.map(
      (id) => `${id}: test names a requirement that is not in an approved spec`,
    ),
  ],
  `${String(new Set(approved).size)} approved requirements, all tested`,
);
