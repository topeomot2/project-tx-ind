import { randomUUID } from "node:crypto";
import type { AccountStore, StoredUser } from "../accounts.ts";

/**
 * In-memory adapter for the AccountStore seam, shared by the accounts unit
 * and property tests. Records every value it is given in `received`, so a
 * test can check that no password reaches the store (ACC-11).
 *
 * Locked like the tests: only spec and test work changes it.
 */
export function fakeAccountStore(): AccountStore & { received: unknown[] } {
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
