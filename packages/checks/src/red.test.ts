import { describe, expect, it } from "vitest";
import { classifyFailure, redProblems } from "./red.ts";

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
});
