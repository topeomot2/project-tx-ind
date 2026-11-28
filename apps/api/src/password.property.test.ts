import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.ts";

/** 1 to 128 code points of any kind. */
const password = fc.string({ unit: "binary", minLength: 1, maxLength: 128 });

// Hashing is slow on purpose (about 32 MiB of work each), so few runs.
// includeErrorInReport puts the cause (e.g. NotImplemented) in the message.
const slow = { numRuns: 10, includeErrorInReport: true };

describe("password hashing properties", () => {
  it("PWD-5: every password verifies against its own hash", async () => {
    await fc.assert(
      fc.asyncProperty(password, async (p) => {
        expect(await verifyPassword(p, await hashPassword(p))).toBe(true);
      }),
      slow,
    );
  }, 60_000);

  it("PWD-6: no other password verifies against a hash", async () => {
    const twoPasswords = fc
      .tuple(password, password)
      .filter(([p, q]) => p.normalize("NFKC") !== q.normalize("NFKC"));

    await fc.assert(
      fc.asyncProperty(twoPasswords, async ([p, q]) => {
        expect(await verifyPassword(q, await hashPassword(p))).toBe(false);
      }),
      slow,
    );
  }, 60_000);
});
