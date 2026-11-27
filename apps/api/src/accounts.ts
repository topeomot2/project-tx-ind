import type {
  ChangePasswordRequest,
  LogInRequest,
  RegisterRequest,
  Session,
  User,
} from "@repo/contracts";
import { randomUUID } from "node:crypto";
import { sign, verify } from "hono/jwt";
import { z } from "zod";
import { hashPassword, verifyPassword } from "./password.ts";

const sessionSeconds = 24 * 60 * 60;

/** The token claims accounts relies on. */
const ClaimsSchema = z.object({
  sub: z.string(),
  ver: z.number().int(),
  exp: z.number(),
});

let dummy: Promise<string> | undefined;
/** A hash no password matches, made once, for logins with unknown emails. */
function dummyHash(): Promise<string> {
  dummy ??= hashPassword(randomUUID());
  return dummy;
}

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
export function createAccounts({
  store,
  now,
  jwtSecret,
}: AccountsDeps): Accounts {
  /** A session for a user, valid for 24 hours from now(). */
  async function issueSession(user: StoredUser): Promise<Session> {
    const iat = Math.floor(now().getTime() / 1000);
    const exp = iat + sessionSeconds;
    const token = await sign(
      { sub: user.id, ver: user.tokenVersion, iat, exp, jti: randomUUID() },
      jwtSecret,
      "HS256",
    );
    return { token, expiresAt: new Date(exp * 1000).toISOString() };
  }

  /** The stored user a token belongs to, if the token is valid now. */
  async function userOf(token: string): Promise<StoredUser | undefined> {
    let payload: unknown;
    try {
      // Expiry is checked against now() below, not the real clock.
      payload = await verify(token, jwtSecret, {
        alg: "HS256",
        exp: false,
        iat: false,
        nbf: false,
      });
    } catch {
      return undefined;
    }
    const claims = ClaimsSchema.safeParse(payload);
    if (!claims.success || now().getTime() >= claims.data.exp * 1000) {
      return undefined;
    }
    const user = await store.findUserById(claims.data.sub);
    return user?.tokenVersion === claims.data.ver ? user : undefined;
  }

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
    async logIn({ email, password }) {
      const user = await store.findUserByEmail(email.toLowerCase());
      // Same hashing work for an unknown email, so timing does not tell.
      const matches = await verifyPassword(
        password,
        user?.passwordHash ?? (await dummyHash()),
      );
      if (user === undefined || !matches) {
        return { ok: false, code: "invalid_credentials" };
      }
      return { ok: true, value: await issueSession(user) };
    },
    async authenticate(token) {
      const user = await userOf(token);
      return user && toUser(user);
    },
    changePassword: notImplemented,
  };
}

/** A stored user as callers see one: never the hash. */
function toUser({ id, name, email }: StoredUser): User {
  return { id, name, email };
}
