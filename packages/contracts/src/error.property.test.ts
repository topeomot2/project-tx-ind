import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ApiErrorSchema } from "./index.ts";

/** Dictionary keys that stay plain data ("__proto__" would set the prototype). */
const safeKey = fc.string().filter((k) => k !== "__proto__");

/**
 * Any value that obeys the contract, built independently of the schema.
 * Compared with toEqual (same data), because fast-check also makes
 * null-prototype objects and Zod returns plain ones.
 */
const validApiError = fc.record(
  {
    code: fc.stringMatching(/^[a-z][a-z0-9_]{0,30}$/),
    message: fc.string({ minLength: 1 }),
    details: fc.dictionary(safeKey, fc.jsonValue()),
  },
  { requiredKeys: ["code", "message"] },
);

describe("ApiErrorSchema properties", () => {
  it("CON-7: accepts every valid error unchanged", () => {
    fc.assert(
      fc.property(validApiError, (error) => {
        expect(ApiErrorSchema.parse(error)).toEqual(error);
      }),
    );
  });

  it("CON-8: still accepts an error after it crosses a JSON boundary", () => {
    // Compare with what arrives, not with the original: JSON changes some
    // values on the way (fast-check found that -0 arrives as 0).
    fc.assert(
      fc.property(validApiError, (error) => {
        const received: unknown = JSON.parse(JSON.stringify(error));

        expect(ApiErrorSchema.parse(received)).toEqual(received);
      }),
    );
  });

  it("CON-9: rejects any code outside the allowed pattern", () => {
    const badCode = fc
      .string({ minLength: 1 })
      .filter((code) => !/^[a-z][a-z0-9_]*$/.test(code));

    fc.assert(
      fc.property(badCode, (code) => {
        expect(ApiErrorSchema.safeParse({ code, message: "x" }).success).toBe(
          false,
        );
      }),
    );
  });
});
