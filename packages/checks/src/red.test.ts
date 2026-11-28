import { describe, expect, it } from "vitest";
import {
  classifyFailure,
  filesToRestore,
  lockingCommit,
  redProblems,
  redTestFiles,
} from "./red.ts";

const failed = (title: string, message: string) => ({
  title,
  status: "failed",
  failureMessages: [message],
});

describe("RED check", () => {
  it.each([
    ["AssertionError: expected 404 to be 200", "assertion"],
    ["Error: NotImplemented\n    at createOrder", "not-implemented"],
    ["Error: Cannot find module './orders.ts'", "other"],
    ["TypeError: Cannot read properties of undefined", "other"],
  ] as const)("CHK-7: classifies %j as %s", (message, kind) => {
    expect(classifyFailure([message])).toBe(kind);
  });

  it("CHK-16: says when fast-check hid why a property failed", () => {
    const problems = redProblems(new Set(["ORD-4"]), [
      failed(
        "ORD-4: totals are never negative",
        "Error: Property failed after 1 tests\nCounterexample: [0]",
      ),
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("includeErrorInReport");
  });

  it("CHK-8: accepts new tests that fail with an assertion or NotImplemented", () => {
    const problems = redProblems(new Set(["ORD-1", "ORD-2"]), [
      failed("ORD-1: creates an order", "AssertionError: expected 1 to be 2"),
      failed("ORD-2: rejects an empty cart", "Error: NotImplemented"),
    ]);

    expect(problems).toEqual([]);
  });

  it("CHK-9: reports new tests that pass, fail for the wrong reason, or never ran", () => {
    const problems = redProblems(new Set(["ORD-1", "ORD-2", "ORD-3"]), [
      {
        title: "ORD-1: creates an order",
        status: "passed",
        failureMessages: [],
      },
      failed(
        "ORD-2: rejects an empty cart",
        "Error: Cannot find module './orders.ts'",
      ),
    ]);

    expect(problems).toEqual([
      "ORD-1: creates an order: passes before any implementation exists",
      "ORD-2: rejects an empty cart: fails for the wrong reason: Error: Cannot find module './orders.ts'",
      "ORD-3: no test with this ID ran",
    ]);
  });

  it("CHK-10: ignores tests whose requirement is not new", () => {
    const problems = redProblems(new Set(["ORD-2"]), [
      {
        title: "ORD-1: creates an order",
        status: "passed",
        failureMessages: [],
      },
      failed(
        "ORD-2: rejects an empty cart",
        "AssertionError: expected true to be false",
      ),
    ]);

    expect(problems).toEqual([]);
  });

  it("CHK-11: the locking commit is the newest that changed a unit or property test", () => {
    const commits = [
      { sha: "c4", files: ["apps/shop/src/orders.ts"] },
      { sha: "c3", files: ["apps/shop/src/orders.integration.test.ts"] },
      { sha: "c2", files: ["apps/shop/src/orders.property.test.ts"] },
      { sha: "c1", files: ["apps/shop/src/orders.test.ts"] },
    ];

    expect(lockingCommit(commits)).toBe("c2");
  });

  it("CHK-11: there is no locking commit when no commit changed a test", () => {
    const commits = [{ sha: "c1", files: ["apps/shop/src/orders.ts"] }];

    expect(lockingCommit(commits)).toBeUndefined();
  });

  it("CHK-12: puts unlocked files back as they were at the locking commit", () => {
    const plan = filesToRestore({
      changes: [
        { status: "M", path: "apps/shop/src/orders.ts" },
        { status: "A", path: "apps/shop/src/orders-db.ts" },
        { status: "D", path: "apps/shop/src/old.ts" },
        { status: "M", path: "apps/shop/src/orders.test.ts" },
        { status: "M", path: "specs/modules/orders.md" },
      ],
      locked: ["**/*.test.ts", "specs/modules/**"],
    });

    expect(plan).toEqual({
      restore: ["apps/shop/src/orders.ts", "apps/shop/src/old.ts"],
      remove: ["apps/shop/src/orders-db.ts"],
    });
  });

  it("CHK-13: judges unit and property tests, and skips contract and checks tests", () => {
    const files = redTestFiles([
      "packages/contracts/src/orders.test.ts",
      "packages/checks/src/red.test.ts",
      "apps/shop/src/orders.test.ts",
      "apps/shop/src/orders.property.test.ts",
      "apps/shop/src/db.integration.test.ts",
      "apps/shop/src/orders.ts",
    ]);

    expect(files).toEqual({
      judged: [
        "apps/shop/src/orders.test.ts",
        "apps/shop/src/orders.property.test.ts",
      ],
      skipped: [
        "packages/contracts/src/orders.test.ts",
        "packages/checks/src/red.test.ts",
      ],
    });
  });
});
