import { describe, expect, it } from "vitest";
import { ApiErrorSchema } from "./index.ts";

describe("ApiErrorSchema", () => {
  it("CON-1: accepts a code and a message", () => {
    const result = ApiErrorSchema.safeParse({
      code: "not_found",
      message: "No order with that id.",
    });

    expect(result.success).toBe(true);
  });

  it("CON-2: accepts structured details", () => {
    const result = ApiErrorSchema.safeParse({
      code: "validation_failed",
      message: "The request was not valid.",
      details: { field: "email" },
    });

    expect(result.success).toBe(true);
  });

  it.each(["NotFound", "not-found", "1_bad", "", "has space"])(
    "CON-3: rejects the code %j",
    (code) => {
      const result = ApiErrorSchema.safeParse({ code, message: "x" });

      expect(result.success).toBe(false);
    },
  );

  it("CON-4: rejects an empty message", () => {
    const result = ApiErrorSchema.safeParse({ code: "oops", message: "" });

    expect(result.success).toBe(false);
  });
});
