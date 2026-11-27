import { matchesGlob } from "node:path";

/** Spec and test work, or implementation work. */
export type WorkKind = "spec" | "impl";

/**
 * Branches named `spec/...` carry spec and test work. Every other branch is
 * treated as implementation work, the strictest case.
 */
export function workKind(branch: string): WorkKind {
  return branch.startsWith("spec/") ? "spec" : "impl";
}

/** Changed files that the given kind of work may not touch. */
export function lockViolations({
  kind,
  changedFiles,
  locked,
}: {
  kind: WorkKind;
  changedFiles: readonly string[];
  locked: readonly string[];
}): string[] {
  if (kind === "spec") {
    return [];
  }
  return changedFiles.filter((file) =>
    locked.some((glob) => matchesGlob(file, glob)),
  );
}
