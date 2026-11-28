import { describe, expect, it } from "vitest";
import { createSessionStore } from "./session.ts";
import { memoryStorage } from "./testing/memory-storage.ts";

const session = {
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlLXRoYXQtaXMtbG9uZw",
  expiresAt: "2026-11-28T12:00:00.000Z",
};

/** A store over fresh storage, with a clock the test moves by hand. */
function setup(start = "2026-11-27T12:00:00.000Z") {
  const clock = { now: new Date(start) };
  const storage = memoryStorage();
  const store = createSessionStore({ storage, now: () => clock.now });
  return { store, storage, clock };
}

describe("session store", () => {
  it("WSES-1: a saved session gives its token until it expires", () => {
    const { store, storage, clock } = setup();
    store.save(session);

    clock.now = new Date("2026-11-28T11:59:59.999Z");
    const before = store.token();
    clock.now = new Date("2026-11-28T12:00:00.000Z");
    const at = store.token();

    expect(before).toBe(session.token);
    expect(at).toBeUndefined();
    expect(storage.items.has("session")).toBe(false);
  });

  it("WSES-2: clear forgets the session", () => {
    const { store } = setup();
    store.save(session);

    store.clear();

    expect(store.token()).toBeUndefined();
  });

  it("WSES-3: a new store over the same storage sees the session", () => {
    const { store, storage, clock } = setup();
    store.save(session);

    const later = createSessionStore({ storage, now: () => clock.now });

    expect(later.token()).toBe(session.token);
  });

  it("WSES-4: nothing saved gives no token", () => {
    const { store } = setup();

    expect(store.token()).toBeUndefined();
  });

  it("WSES-4: a damaged value gives no token and is removed", () => {
    for (const damaged of ["not json", '{"token":"x"}']) {
      const { store, storage } = setup();
      storage.setItem("session", damaged);

      const token = store.token();

      expect(token).toBeUndefined();
      expect(storage.items.has("session")).toBe(false);
    }
  });
});
