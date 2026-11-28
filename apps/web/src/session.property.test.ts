import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createSessionStore } from "./session.ts";
import { memoryStorage } from "./testing/memory-storage.ts";

const hour = 60 * 60 * 1000;
const base64url = (text: string) => Buffer.from(text).toString("base64url");
const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));

/** A JWT: a real header, a JSON payload and a base64url signature. */
const jwts = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.stringMatching(/^[A-Za-z0-9_-]{16,43}$/),
  )
  .map(
    ([sub, signature]) =>
      `${header}.${base64url(JSON.stringify({ sub }))}.${signature}`,
  );

/** A valid Session as the spec describes it: a JWT and a UTC time. */
const sessions = fc.record({
  token: jwts,
  expiresAt: fc
    .date({
      min: new Date("2020-01-01T00:00:00.000Z"),
      max: new Date("2040-01-01T00:00:00.000Z"),
      noInvalidDate: true,
    })
    .map((date) => date.toISOString()),
});

describe("session store", () => {
  it("WSES-5: the token is there exactly while the session lasts", () => {
    fc.assert(
      fc.property(
        sessions,
        fc.integer({ min: -hour, max: hour }),
        (session, offset) => {
          const now = new Date(Date.parse(session.expiresAt) + offset);
          const store = createSessionStore({
            storage: memoryStorage(),
            now: () => now,
          });
          store.save(session);

          const token = store.token();

          expect(token).toBe(offset < 0 ? session.token : undefined);
        },
      ),
    );
  });
});
