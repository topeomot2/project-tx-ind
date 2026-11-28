import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createSessionStore } from "./session.ts";
import { memoryStorage } from "./testing/memory-storage.ts";

const hour = 60 * 60 * 1000;
const base64url = fc.stringMatching(/^[A-Za-z0-9_-]{4,40}$/);

/** A valid Session as the spec describes it: a JWT and a UTC time. */
const sessions = fc.record({
  token: fc
    .tuple(base64url, base64url, base64url)
    .map((parts) => parts.join(".")),
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
