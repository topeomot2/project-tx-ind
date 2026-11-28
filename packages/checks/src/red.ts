import { matchesGlob } from "node:path";
import { idFromTitle } from "./spec-ids.ts";

export type FailureKind = "assertion" | "not-implemented" | "other";

/** Why a test failed, from its failure messages. */
export function classifyFailure(messages: readonly string[]): FailureKind {
  const text = messages.join("\n");
  if (/\bNotImplemented\b/.test(text)) {
    return "not-implemented";
  }
  if (/\bAssertionError\b/.test(text)) {
    return "assertion";
  }
  return "other";
}

export interface TestResult {
  title: string;
  status: string;
  failureMessages: string[];
}

/**
 * Checks that every new requirement's test fails, and for an acceptable
 * reason (an assertion, or the NotImplemented stub). Returns the problems.
 */
export function redProblems(
  newIds: ReadonlySet<string>,
  results: readonly TestResult[],
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const id = idFromTitle(result.title);
    if (id === undefined || !newIds.has(id)) {
      continue;
    }
    seen.add(id);
    if (result.status === "passed") {
      problems.push(`${result.title}: passes before any implementation exists`);
    } else if (classifyFailure(result.failureMessages) === "other") {
      const reason = result.failureMessages[0]?.split("\n")[0] ?? "no message";
      problems.push(`${result.title}: fails for the wrong reason: ${reason}`);
    }
  }

  for (const id of newIds) {
    if (!seen.has(id)) {
      problems.push(`${id}: no test with this ID ran`);
    }
  }
  return problems;
}

/** A unit or property test file: the kind of test file RED runs. */
function isUnitTestFile(file: string): boolean {
  return /\.test\.(ts|js)$/.test(file) && !file.includes(".integration.");
}

/**
 * The unit and property test files that RED judges, and the ones it skips.
 * Contract tests are skipped: contracts are real schemas, approved with the
 * spec, so their tests are expected to pass before any implementation. So
 * are the checks' own tests: the checks are tooling, changed only on spec
 * branches with human approval, and land with their implementation.
 */
export function redTestFiles(changedFiles: readonly string[]): {
  judged: string[];
  skipped: string[];
} {
  const tests = changedFiles.filter(isUnitTestFile);
  const isSkipped = (file: string) =>
    file.startsWith("packages/contracts/") ||
    file.startsWith("packages/checks/");
  return {
    judged: tests.filter((file) => !isSkipped(file)),
    skipped: tests.filter(isSkipped),
  };
}

export interface Commit {
  sha: string;
  files: readonly string[];
}

/**
 * The locking commit: the newest commit that changed a unit or property test
 * file. RED is judged as the branch was then, before any implementation was
 * merged into it. Commits come newest first.
 */
export function lockingCommit(commits: readonly Commit[]): string | undefined {
  return commits.find((commit) => commit.files.some(isUnitTestFile))?.sha;
}

export interface FileChange {
  /** Git status letter: A (added), M (modified) or D (deleted). */
  status: string;
  path: string;
}

/**
 * How to put the branch back to the locking commit for a RED run, given the
 * changes from the locking commit to HEAD. Locked paths stay as they are.
 * Files added since are removed; every other change is restored.
 */
export function filesToRestore({
  changes,
  locked,
}: {
  changes: readonly FileChange[];
  locked: readonly string[];
}): { restore: string[]; remove: string[] } {
  const unlocked = changes.filter(
    (change) => !locked.some((glob) => matchesGlob(change.path, glob)),
  );
  return {
    restore: unlocked.filter((c) => c.status !== "A").map((c) => c.path),
    remove: unlocked.filter((c) => c.status === "A").map((c) => c.path),
  };
}
