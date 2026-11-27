import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Repo root: these scripts are run from it by the root package.json. */
export const root = process.cwd();

export function git(...args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

/** The branch the PR merges into. CI sets BASE_REF; locally origin/main. */
export function baseRef(): string {
  return process.env["BASE_REF"] ?? "origin/main";
}

/** The branch being checked. GitHub sets GITHUB_HEAD_REF on pull requests. */
export function headBranch(): string {
  const fromCI = process.env["GITHUB_HEAD_REF"];
  return fromCI !== undefined && fromCI !== ""
    ? fromCI
    : git("rev-parse", "--abbrev-ref", "HEAD");
}

/** Files changed on this branch since it left the base branch. */
export function changedFiles(filter = "ACDMR"): string[] {
  const out = git(
    "diff",
    "--name-only",
    `--diff-filter=${filter}`,
    `${baseRef()}...HEAD`,
  );
  return out === "" ? [] : out.split("\n");
}

export function readText(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

/** Prints the problems and sets a failing exit code, or prints the OK line. */
export function report(
  title: string,
  problems: readonly string[],
  ok: string,
): void {
  if (problems.length === 0) {
    console.log(`✓ ${ok}`);
    return;
  }
  console.error(`✗ ${title}`);
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exitCode = 1;
}
