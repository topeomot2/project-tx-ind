import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { PasswordSchema } from "./index.ts";

describe("PasswordSchema properties", () => {
  it("UCON-9: accepts a password exactly when it has 15 to 128 code points", () => {
    // Build the password from a known number of code points, so the
    // expected length comes from the generator, not from counting.
    const codePoint = fc.string({ unit: "binary", minLength: 1, maxLength: 1 });
    const password = fc.array(codePoint, { maxLength: 160 });

    fc.assert(
      fc.property(password, (parts) => {
        const result = PasswordSchema.safeParse(parts.join(""));

        expect(result.success).toBe(parts.length >= 15 && parts.length <= 128);
      }),
    );
  });
});
