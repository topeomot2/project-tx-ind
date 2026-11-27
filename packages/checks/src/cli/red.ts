// On spec/ branches: every new requirement's unit or property test fails,
// for an acceptable reason, before implementation. Run: pnpm check:red
// Integration and E2E tests are not run here (they need services and apps).
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { workKind } from "../locks.ts";
import { redProblems, type TestResult } from "../red.ts";
import { idsFromTestSource } from "../spec-ids.ts";
import {
  baseRef,
  changedFiles,
  git,
  headBranch,
  readText,
  report,
  root,
} from "./shared.ts";

interface VitestJson {
  testResults: {
    name: string;
    message: string;
    assertionResults: TestResult[];
  }[];
}

const branch = headBranch();
if (workKind(branch) !== "spec") {
  console.log(`✓ Branch "${branch}" is not spec work; nothing to check`);
  process.exit(0);
}

const testFiles = changedFiles("AM").filter(
  (file) => /\.test\.(ts|js)$/.test(file) && !file.includes(".integration."),
);

/** IDs in a test file now, minus the IDs it had on the base branch. */
function newIdsIn(file: string): string[] {
  let before: string[] = [];
  try {
    before = idsFromTestSource(git("show", `${baseRef()}:${file}`));
  } catch {
    // New file: every ID is new.
  }
  return idsFromTestSource(readText(file)).filter((id) => !before.includes(id));
}

/** The workspace package folder that holds a file. */
function packageOf(file: string): string {
  let dir = dirname(join(root, file));
  while (!existsSync(join(dir, "package.json"))) {
    dir = dirname(dir);
  }
  return dir;
}

const newIds = new Set(testFiles.flatMap(newIdsIn));
const byPackage = Map.groupBy(testFiles, packageOf);
const results: TestResult[] = [];
const suiteErrors: string[] = [];
const outDir = mkdtempSync(join(tmpdir(), "red-"));

for (const [packageDir, files] of byPackage) {
  const outputFile = join(
    outDir,
    `${String(results.length)}-${String(suiteErrors.length)}.json`,
  );
  try {
    execFileSync(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--reporter=json",
        `--outputFile=${outputFile}`,
        ...files.map((f) => relative(packageDir, join(root, f))),
      ],
      { cwd: packageDir, stdio: "ignore" },
    );
  } catch {
    // Failing tests are expected here; the JSON report says how they failed.
  }
  const json = JSON.parse(readFileSync(outputFile, "utf8")) as VitestJson;
  for (const suite of json.testResults) {
    results.push(...suite.assertionResults);
    if (suite.assertionResults.length === 0 && suite.message !== "") {
      suiteErrors.push(
        `${relative(root, suite.name)}: ${suite.message.split("\n")[0] ?? ""}`,
      );
    }
  }
}

report(
  "RED check failed: new tests must fail with an assertion or NotImplemented",
  [...suiteErrors, ...redProblems(newIds, results)],
  `${String(newIds.size)} new requirement tests fail for the right reason`,
);
