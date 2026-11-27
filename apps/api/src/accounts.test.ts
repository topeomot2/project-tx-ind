import { SessionSchema, UserSchema } from "@repo/contracts";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createAccounts,
  type AccountStore,
  type Accounts,
  type StoredUser,
} from "./accounts.ts";

const secret = "test-secret-that-is-at-least-32-characters";
const ada = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "correct horse battery",
};
const newPassword = "tr0ub4dor & 3 more";

/**
 * In-memory adapter for the AccountStore seam. Records every value it is
 * given, so ACC-11 can check that no password reaches the store.
 */
function fakeStore(): AccountStore & { received: unknown[] } {
  const users = new Map<string, StoredUser>();
  const received: unknown[] = [];
  return {
    received,
    insertUser(user) {
      received.push(user);
      if ([...users.values()].some((u) => u.email === user.email)) {
        return Promise.resolve("email_taken");
      }
      const stored = { ...user, id: randomUUID(), tokenVersion: 0 };
      users.set(stored.id, stored);
      return Promise.resolve({ ...stored });
    },
    findUserByEmail(email) {
      received.push(email);
      const found = [...users.values()].find((u) => u.email === email);
      return Promise.resolve(found && { ...found });
    },
    findUserById(id) {
      received.push(id);
      const found = users.get(id);
      return Promise.resolve(found && { ...found });
    },
    setPasswordHash(userId, passwordHash) {
      received.push(userId, passwordHash);
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

/** Accounts with a fake store and a clock the test moves by hand. */
function setup(start = "2026-11-27T12:00:00.000Z") {
  const clock = { now: new Date(start) };
  const store = fakeStore();
  const accounts = createAccounts({
    store,
    now: () => clock.now,
    jwtSecret: secret,
  });
  return { accounts, store, clock };
}

async function registerAndLogIn(accounts: Accounts, who = ada) {
  await accounts.register(who);
  const result = await accounts.logIn({
    email: who.email,
    password: who.password,
  });
  if (!result.ok) {
    throw new Error(`log in failed: ${result.code}`);
  }
  return SessionSchema.parse(result.value).token;
}

describe("accounts", () => {
  it("ACC-1: register returns the new user with the email lowercased", async () => {
    const { accounts } = setup();

    const result = await accounts.register({
      ...ada,
      email: "Ada@Example.com",
    });

    expect(result.ok).toBe(true);
    const user = UserSchema.parse(result.ok ? result.value : undefined);
    expect(user).toEqual({
      id: user.id,
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("ACC-2: register refuses an email that exists in another case", async () => {
    const { accounts } = setup();
    await accounts.register(ada);

    const result = await accounts.register({
      ...ada,
      email: "ADA@example.com",
    });

    expect(result).toEqual({ ok: false, code: "email_taken" });
  });

  it("ACC-3: log in returns a JWT session that lasts 24 hours", async () => {
    const { accounts } = setup("2026-11-27T12:00:00.000Z");
    await accounts.register(ada);

    const result = await accounts.logIn({
      email: "ADA@example.COM",
      password: ada.password,
    });

    expect(result.ok).toBe(true);
    const session = SessionSchema.parse(result.ok ? result.value : undefined);
    expect(session.expiresAt).toBe("2026-11-28T12:00:00.000Z");
  });

  it("ACC-4: log in fails the same way for a wrong password and an unknown email", async () => {
    const { accounts } = setup();
    await accounts.register(ada);

    const wrongPassword = await accounts.logIn({
      email: ada.email,
      password: "not the password",
    });
    const unknownEmail = await accounts.logIn({
      email: "nobody@example.com",
      password: ada.password,
    });

    expect(wrongPassword).toEqual({ ok: false, code: "invalid_credentials" });
    expect(unknownEmail).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("ACC-5: authenticate accepts the token it issued", async () => {
    const { accounts } = setup();
    const token = await registerAndLogIn(accounts);

    const user = await accounts.authenticate(token);

    expect(UserSchema.parse(user)).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("ACC-5: authenticate rejects a value that is not a JWT", async () => {
    const { accounts } = setup();
    await registerAndLogIn(accounts);

    expect(await accounts.authenticate("not-a-jwt")).toBeUndefined();
  });

  it("ACC-5: authenticate rejects a token with a changed signature", async () => {
    const { accounts } = setup();
    const token = await registerAndLogIn(accounts);
    // Change the first signature character: the last one partly encodes
    // padding bits, so changing it may not change the signature.
    const at = token.lastIndexOf(".") + 1;
    const swapped = token[at] === "A" ? "B" : "A";

    const altered = token.slice(0, at) + swapped + token.slice(at + 1);

    expect(await accounts.authenticate(altered)).toBeUndefined();
  });

  it("ACC-5: authenticate rejects a token signed with another secret", async () => {
    const { accounts, store, clock } = setup();
    await accounts.register(ada);
    const other = createAccounts({
      store,
      now: () => clock.now,
      jwtSecret: "another-secret-that-is-also-32-characters",
    });
    const result = await other.logIn({
      email: ada.email,
      password: ada.password,
    });
    const token = result.ok ? result.value.token : "";

    expect(await accounts.authenticate(token)).toBeUndefined();
  });

  it("ACC-6: a token stops working when it expires", async () => {
    const { accounts, clock } = setup("2026-11-27T12:00:00.000Z");
    const token = await registerAndLogIn(accounts);

    clock.now = new Date("2026-11-28T11:59:59.000Z");
    const before = await accounts.authenticate(token);
    clock.now = new Date("2026-11-28T12:00:00.000Z");
    const at = await accounts.authenticate(token);

    expect(before?.email).toBe("ada@example.com");
    expect(at).toBeUndefined();
  });

  it("ACC-7: change password replaces the password and returns a new session", async () => {
    const { accounts } = setup();
    const token = await registerAndLogIn(accounts);

    const result = await accounts.changePassword(token, {
      currentPassword: ada.password,
      newPassword,
    });
    const withNew = await accounts.logIn({
      email: ada.email,
      password: newPassword,
    });
    const withOld = await accounts.logIn({
      email: ada.email,
      password: ada.password,
    });

    expect(result.ok).toBe(true);
    SessionSchema.parse(result.ok ? result.value : undefined);
    expect(withNew.ok).toBe(true);
    expect(withOld).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("ACC-8: change password with a wrong current password changes nothing", async () => {
    const { accounts } = setup();
    const token = await registerAndLogIn(accounts);

    const result = await accounts.changePassword(token, {
      currentPassword: "wrong password",
      newPassword,
    });
    const withOld = await accounts.logIn({
      email: ada.email,
      password: ada.password,
    });

    expect(result).toEqual({ ok: false, code: "invalid_credentials" });
    expect(withOld.ok).toBe(true);
    expect((await accounts.authenticate(token))?.email).toBe(ada.email);
  });

  it("ACC-9: change password needs a token that is a JWT", async () => {
    const { accounts } = setup();
    await registerAndLogIn(accounts);

    const result = await accounts.changePassword("not-a-jwt", {
      currentPassword: ada.password,
      newPassword,
    });

    expect(result).toEqual({ ok: false, code: "unauthenticated" });
  });

  it("ACC-9: change password needs a token that has not expired", async () => {
    const { accounts, clock } = setup("2026-11-27T12:00:00.000Z");
    const token = await registerAndLogIn(accounts);
    clock.now = new Date("2026-11-28T12:00:00.000Z");

    const result = await accounts.changePassword(token, {
      currentPassword: ada.password,
      newPassword,
    });

    expect(result).toEqual({ ok: false, code: "unauthenticated" });
  });

  it("ACC-10: change password ends the user's older tokens only", async () => {
    const { accounts, clock } = setup();
    const t1 = await registerAndLogIn(accounts);
    clock.now = new Date(clock.now.getTime() + 1000);
    const t2 = await registerAndLogIn(accounts);
    const t3 = await registerAndLogIn(accounts, {
      name: "Grace Hopper",
      email: "grace@example.com",
      password: "a ship in harbour is safe",
    });

    const result = await accounts.changePassword(t1, {
      currentPassword: ada.password,
      newPassword,
    });
    const t4 = result.ok ? result.value.token : "";

    expect(await accounts.authenticate(t1)).toBeUndefined();
    expect(await accounts.authenticate(t2)).toBeUndefined();
    expect((await accounts.authenticate(t4))?.email).toBe("ada@example.com");
    expect((await accounts.authenticate(t3))?.email).toBe("grace@example.com");
  });

  it("ACC-11: the store never sees a password", async () => {
    const { accounts, store } = setup();
    const token = await registerAndLogIn(accounts);

    await accounts.changePassword(token, {
      currentPassword: ada.password,
      newPassword,
    });

    const seen = JSON.stringify(store.received);
    expect(seen).not.toContain(ada.password);
    expect(seen).not.toContain(newPassword);
  });
});
