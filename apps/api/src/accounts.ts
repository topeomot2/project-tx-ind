import type {
  ChangePasswordRequest,
  LogInRequest,
  RegisterRequest,
  Session,
  User,
} from "@repo/contracts";
import { hashPassword } from "./password.ts";

/** The outcome of an operation that can fail in an expected way. */
export type Result<T, E extends string> =
  { ok: true; value: T } | { ok: false; code: E };

/** A user as the store keeps one. */
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  /** Bumped on every password change; tokens carry the version they had. */
  tokenVersion: number;
}

/** What accounts needs from storage. The seam for tests. */
export interface AccountStore {
  /** Adds a user with a new UUID and tokenVersion 0. */
  insertUser(user: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<StoredUser | "email_taken">;
  /** Exact match on the stored (lowercased) email. */
  findUserByEmail(email: string): Promise<StoredUser | undefined>;
  findUserById(id: string): Promise<StoredUser | undefined>;
  /** Replaces the hash and adds 1 to tokenVersion. */
  setPasswordHash(userId: string, passwordHash: string): Promise<StoredUser>;
}

export interface Accounts {
  register(request: RegisterRequest): Promise<Result<User, "email_taken">>;
  logIn(request: LogInRequest): Promise<Result<Session, "invalid_credentials">>;
  /** The user a token belongs to, or undefined if it is not valid now. */
  authenticate(token: string): Promise<User | undefined>;
  changePassword(
    token: string,
    request: ChangePasswordRequest,
  ): Promise<Result<Session, "unauthenticated" | "invalid_credentials">>;
}

export interface AccountsDeps {
  store: AccountStore;
  now: () => Date;
  /** HS256 signing key, at least 32 characters. */
  jwtSecret: string;
}

/** Accounts over a store. See specs/modules/accounts.md. */
export function createAccounts({ store }: AccountsDeps): Accounts {
  const notImplemented = () => Promise.reject(new Error("NotImplemented"));
  return {
    async register({ name, email, password }) {
      const stored = await store.insertUser({
        name,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
      });
      if (stored === "email_taken") {
        return { ok: false, code: "email_taken" };
      }
      return { ok: true, value: toUser(stored) };
    },
    logIn: notImplemented,
    authenticate: notImplemented,
    changePassword: notImplemented,
  };
}

/** A stored user as callers see one: never the hash. */
function toUser({ id, name, email }: StoredUser): User {
  return { id, name, email };
}
