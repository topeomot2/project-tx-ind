import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { fakeAccountStore } from "./testing/fake-account-store.ts";
import { fakeMailer } from "./testing/fake-mailer.ts";
import { createVerification } from "./verification.ts";

const ada = {
  id: "0b6c8d62-6f43-4f53-9c4b-3a1d8f2e9a10",
  name: "Ada Lovelace",
  email: "ada@example.com",
};

describe("email verification", () => {
  it("EVER-7: every link is different", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 5 }), async (count) => {
        const mailer = fakeMailer();
        const verification = createVerification({
          store: fakeAccountStore(),
          mailer,
          now: () => new Date("2026-11-27T12:00:00.000Z"),
          webUrl: "http://web.test",
        });

        for (let i = 0; i < count; i += 1) {
          await verification.sendLink(ada);
        }

        const texts = mailer.sent.map((email) => email.text);
        expect(texts).toHaveLength(count);
        expect(new Set(texts).size).toBe(count);
      }),
    );
  });
});
