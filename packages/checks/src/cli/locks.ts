// Implementation work may not change locked paths (factory.json "locked").
// Run in CI on pull requests: pnpm check:locks
import { lockViolations, workKind } from "../locks.ts";
import { changedFiles, headBranch, readText, report } from "./shared.ts";

interface Manifest {
  locked: { hard: string[]; light: string[] };
}

const manifest = JSON.parse(readText("factory.json")) as Manifest;
const branch = headBranch();
const kind = workKind(branch);
const violations = lockViolations({
  kind,
  changedFiles: changedFiles(),
  locked: [...manifest.locked.hard, ...manifest.locked.light],
});

report(
  `Branch "${branch}" is implementation work but changes locked files. ` +
    "Raise a change request instead, or do this on a spec/ branch.",
  violations,
  `Branch "${branch}" (${kind} work) respects the locks`,
);
