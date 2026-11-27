import { describe, expect, it } from "vitest";
import { lockViolations, workKind } from "./locks.ts";

const locked = ["specs/**", "packages/contracts/**", "**/*.test.ts"];

describe("locks", () => {
  it.each([
    ["spec/orders", "spec"],
    ["impl/orders", "impl"],
    ["main", "impl"],
    ["feature/spec/x", "impl"],
  ] as const)("CHK-4: branch %s is %s work", (branch, kind) => {
    expect(workKind(branch)).toBe(kind);
  });

  it("CHK-5: implementation work may not touch locked paths", () => {
    const changedFiles = [
      "apps/api/src/app.ts",
      "apps/api/src/app.test.ts",
      "specs/product/health.md",
      "packages/contracts/src/error.ts",
    ];

    expect(lockViolations({ kind: "impl", changedFiles, locked })).toEqual([
      "apps/api/src/app.test.ts",
      "specs/product/health.md",
      "packages/contracts/src/error.ts",
    ]);
  });

  it("CHK-6: spec work may touch locked paths", () => {
    expect(
      lockViolations({
        kind: "spec",
        changedFiles: ["specs/product/health.md"],
        locked,
      }),
    ).toEqual([]);
  });
});
