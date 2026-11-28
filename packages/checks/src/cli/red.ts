// On spec/ branches: every new requirement's unit or property test fails,
// for an acceptable reason, before implementation. Run: pnpm check:red
// Integration and E2E tests are not run here (they need services and apps).
// RED is judged at the locking commit, so a spec branch that implementation
// was merged into (a stacked branch) stays checkable.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { workKind } from "../locks.ts";
import {
  type Commit,
  type FileChange,
  filesToRestore,
  lockingCommit,
  redProblems,
  redTestFiles,
  type TestResult,
} from "../red.ts";
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

interface Manifest {
  locked: { hard: string[]; light: string[] };
}

const branch = headBranch();
if (workKind(branch) !== "spec") {
  console.log(`✓ Branch "${branch}" is not spec work; nothing to check`);
  process.exit(0);
}

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

/** Commits on this branch since it left the base branch, newest first. */
function branchCommits(): Commit[] {
  const out = git(
    "log",
    "--format=%x00%H",
    "--name-only",
    "--no-renames",
    `${baseRef()}..HEAD`,
  );
  return out
    .split("\0")
    .filter((chunk) => chunk.trim() !== "")
    .map((chunk) => {
      const [sha = "", ...files] = chunk.trim().split("\n");
      return { sha, files: files.filter((file) => file !== "") };
    });
}

/** Files changed from one commit to another. */
function changesBetween(from: string, to: string): FileChange[] {
  const out = git("diff", "--name-status", "--no-renames", from, to);
  return out === ""
    ? []
    : out.split("\n").map((line) => {
        const [status = "", path = ""] = line.split("\t");
        return { status, path };
      });
}

function existsAt(commit: string, path: string): boolean {
  try {
    git("cat-file", "-e", `${commit}:${path}`);
    return true;
  } catch {
    return false;
  }
}

/** Writes the given files into the working tree as they are at a commit. */
function restoreFrom(commit: string, paths: readonly string[]): void {
  if (paths.length > 0) {
    git("restore", `--source=${commit}`, "--worktree", "--", ...paths);
  }
}

function removeAll(paths: readonly string[]): void {
  for (const path of paths) {
    rmSync(join(root, path), { force: true });
  }
}

const manifest = JSON.parse(readText("factory.json")) as Manifest;
const locked = [...manifest.locked.hard, ...manifest.locked.light];
const { judged: testFiles, skipped } = redTestFiles(changedFiles("AM"));

const skippedIds = new Set(skipped.flatMap(newIdsIn));
console.log(
  `- Skipped ${String(skippedIds.size)} contract and checks test IDs ` +
    "(their tests are expected to pass; see CHK-13)",
);

const head = git("rev-parse", "HEAD");
const lock = lockingCommit(branchCommits());
const plan =
  lock === undefined || lock === head
    ? { restore: [], remove: [] }
    : filesToRestore({ changes: changesBetween(lock, head), locked });
const touched = [...plan.restore, ...plan.remove];

if (lock !== undefined && touched.length > 0) {
  if (git("status", "--porcelain", "--", ...touched) !== "") {
    console.error(
      "✗ RED check needs to restore files that have uncommitted changes. " +
        "Commit or stash them first.",
    );
    process.exit(1);
  }
  console.log(
    `- Judging RED at locking commit ${lock.slice(0, 7)}: ` +
      `restoring ${String(plan.restore.length)} files, ` +
      `removing ${String(plan.remove.length)}`,
  );
}

const newIds = new Set(testFiles.flatMap(newIdsIn));
const byPackage = Map.groupBy(testFiles, packageOf);
const results: TestResult[] = [];
const suiteErrors: string[] = [];
const outDir = mkdtempSync(join(tmpdir(), "red-"));

try {
  if (lock !== undefined) {
    restoreFrom(lock, plan.restore);
    removeAll(plan.remove);
  }
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
} finally {
  // Put HEAD back exactly: files HEAD has are restored, the rest removed.
  const atHead = touched.filter((path) => existsAt(head, path));
  restoreFrom(head, atHead);
  removeAll(touched.filter((path) => !atHead.includes(path)));
}

report(
  "RED check failed: new tests must fail with an assertion or NotImplemented",
  [...suiteErrors, ...redProblems(newIds, results)],
  `${String(newIds.size)} new requirement tests fail for the right reason`,
);
