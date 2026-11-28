import { randomUUID } from "node:crypto";
import type { AccountStore, StoredUser } from "../accounts.ts";

/**
 * In-memory adapter for the AccountStore seam, shared by the accounts and
 * verification unit and property tests. Records every value it is given in
 * `received`, so a test can check that no password or token reaches the
 * store (ACC-11, EVER-6).
 *
 * `verifyOnInsert: true` stores new users as verified, as if they had used
 * their link, for tests about logging in rather than verifying.
 *
 * Locked like the tests: only spec and test work changes it.
 */
export function fakeAccountStore({
  verifyOnInsert = false,
} = {}): AccountStore & {
  received: unknown[];
} {
  const users = new Map<string, StoredUser>();
  const verifications = new Map<string, { userId: string; expiresAt: Date }>();
  const received: unknown[] = [];

  function update(userId: string, change: Partial<StoredUser>) {
    const found = users.get(userId);
    if (found === undefined) {
      return Promise.reject(new Error(`No user ${userId}`));
    }
    const updated = { ...found, ...change };
    users.set(userId, updated);
    return Promise.resolve({ ...updated });
  }

  return {
    received,
    insertUser(user) {
      received.push(user);
      if ([...users.values()].some((u) => u.email === user.email)) {
        return Promise.resolve("email_taken");
      }
      const stored = {
        ...user,
        id: randomUUID(),
        tokenVersion: 0,
        emailVerified: verifyOnInsert,
      };
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
      const tokenVersion = (users.get(userId)?.tokenVersion ?? 0) + 1;
      return update(userId, { passwordHash, tokenVersion });
    },
    endSessions(userId) {
      received.push(userId);
      const tokenVersion = (users.get(userId)?.tokenVersion ?? 0) + 1;
      return update(userId, { tokenVersion });
    },
    async markEmailVerified(userId) {
      received.push(userId);
      await update(userId, { emailVerified: true });
    },
    insertVerification(verification) {
      received.push(verification);
      verifications.set(verification.tokenHash, {
        userId: verification.userId,
        expiresAt: verification.expiresAt,
      });
      return Promise.resolve();
    },
    takeVerification(tokenHash) {
      received.push(tokenHash);
      const found = verifications.get(tokenHash);
      verifications.delete(tokenHash);
      return Promise.resolve(found && { ...found });
    },
  };
}
