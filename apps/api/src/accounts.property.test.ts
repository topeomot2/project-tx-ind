import { SessionSchema } from "@repo/contracts";
import fc from "fast-check";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createAccounts,
  type AccountStore,
  type StoredUser,
} from "./accounts.ts";

/** In-memory adapter for the AccountStore seam (as in accounts.test.ts). */
function fakeStore(): AccountStore {
  const users = new Map<string, StoredUser>();
  return {
    insertUser(user) {
      if ([...users.values()].some((u) => u.email === user.email)) {
        return Promise.resolve("email_taken");
      }
      const stored = { ...user, id: randomUUID(), tokenVersion: 0 };
      users.set(stored.id, stored);
      return Promise.resolve({ ...stored });
    },
    findUserByEmail(email) {
      const found = [...users.values()].find((u) => u.email === email);
      return Promise.resolve(found && { ...found });
    },
    findUserById(id) {
      const found = users.get(id);
      return Promise.resolve(found && { ...found });
    },
    setPasswordHash(userId, passwordHash) {
      const found = users.get(userId);
      if (found === undefined) {
        return Promise.reject(new Error(`No user ${userId}`));
      }
      const updated = {
        ...found,
        passwordHash,
        tokenVersion: found.tokenVersion + 1,
      };
      users.set(userId, updated);
      return Promise.resolve({ ...updated });
    },
  };
}

function setup() {
  return createAccounts({
    store: fakeStore(),
    now: () => new Date("2026-11-27T12:00:00.000Z"),
    jwtSecret: "test-secret-that-is-at-least-32-characters",
  });
}

/** Valid RegisterRequest values, built from the spec's rules. */
const registerRequest = fc.record({
  name: fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((name) => name.trim() !== ""),
  email: fc
    .tuple(
      fc.stringMatching(/^[a-z0-9]{1,20}$/),
      fc.stringMatching(/^[a-z0-9]{1,20}$/),
    )
    .map(([local, domain]) => `${local}@${domain}.com`),
  password: fc.string({ unit: "binary", minLength: 15, maxLength: 128 }),
});

// Hashing is slow on purpose, so few runs.
// includeErrorInReport puts the cause (e.g. NotImplemented) in the message.
const slow = { numRuns: 10, includeErrorInReport: true };

describe("accounts properties", () => {
  it("ACC-12: whoever registers can log in, with the email in upper case", async () => {
    await fc.assert(
      fc.asyncProperty(registerRequest, async (request) => {
        const accounts = setup();
        await accounts.register(request);

        const result = await accounts.logIn({
          email: request.email.toUpperCase(),
          password: request.password,
        });

        expect(result.ok).toBe(true);
      }),
      slow,
    );
  }, 60_000);

  it("ACC-13: every log in gets a new token", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 5 }), async (count) => {
        const accounts = setup();
        const ada = {
          name: "Ada Lovelace",
          email: "ada@example.com",
          password: "correct horse battery",
        };
        await accounts.register(ada);

        const tokens: string[] = [];
        for (let i = 0; i < count; i++) {
          const result = await accounts.logIn(ada);
          tokens.push(
            SessionSchema.parse(result.ok ? result.value : undefined).token,
          );
        }

        expect(new Set(tokens).size).toBe(count);
      }),
      slow,
    );
  }, 60_000);
});
