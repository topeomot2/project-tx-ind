import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { registerErrors } from "./forms.ts";

const letters = (min: number, max: number) =>
  fc.stringMatching(new RegExp(`^[a-z]{${String(min)},${String(max)}}$`));

/** Built from the spec's rules, not from the contract under test. */
const names = fc
  .tuple(
    fc.stringMatching(/^[A-Za-zÀ-ÿ0-9 ]{1,96}$/).map((s) => s.trim()),
    fc.constantFrom("", " ", "  "),
  )
  .filter(([core]) => core.length > 0)
  .map(([core, pad]) => `${pad}${core}${pad}`);
const emails = fc
  .tuple(letters(1, 20), letters(1, 20), letters(2, 6))
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);
const passwords = fc
  .array(fc.string({ unit: "grapheme-ascii", minLength: 1, maxLength: 1 }), {
    minLength: 15,
    maxLength: 128,
  })
  .map((chars) => chars.join(""));

describe("register form checks", () => {
  it("WFORM-5: any form within the rules has no messages", () => {
    fc.assert(
      fc.property(names, emails, passwords, (name, email, password) => {
        expect(registerErrors({ name, email, password })).toEqual({});
      }),
    );
  });
});
