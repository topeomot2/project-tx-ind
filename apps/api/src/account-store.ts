import postgres from "postgres";
import type { AccountStore, StoredUser } from "./accounts.ts";

/** The Postgres adapter for AccountStore, plus table setup and shutdown. */
export interface PostgresAccountStore extends AccountStore {
  /** Creates the tables if they are missing. Safe to run at every start. */
  migrate(): Promise<void>;
  /** Closes all connections. */
  close(): Promise<void>;
}

/** A row of the users table. */
interface Row {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  token_version: number;
  email_verified: boolean;
}

function toStoredUser(row: Row): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    tokenVersion: row.token_version,
    emailVerified: row.email_verified,
  };
}

/** See specs/modules/account-store.md. Connects lazily, on first use. */
export function createPostgresAccountStore(url: string): PostgresAccountStore {
  const sql = postgres(url, {
    max: 5,
    connect_timeout: 2,
    onnotice: () => undefined,
  });

  return {
    async migrate() {
      await sql`
        create table if not exists users (
          id uuid primary key default gen_random_uuid(),
          name text not null,
          email text not null unique,
          password_hash text not null,
          token_version integer not null default 0
        )
      `;
      await sql`
        alter table users
        add column if not exists email_verified boolean not null default false
      `;
      await sql`
        create table if not exists email_verifications (
          token_hash text primary key,
          user_id uuid not null references users (id) on delete cascade,
          expires_at timestamptz not null
        )
      `;
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
    async insertUser({ name, email, passwordHash }) {
      const rows = await sql<Row[]>`
        insert into users (name, email, password_hash)
        values (${name}, ${email}, ${passwordHash})
        on conflict (email) do nothing
        returning *
      `;
      const [row] = rows;
      return row === undefined ? "email_taken" : toStoredUser(row);
    },
    async findUserByEmail(email) {
      const [row] = await sql<
        Row[]
      >`select * from users where email = ${email}`;
      return row && toStoredUser(row);
    },
    async findUserById(id) {
      const [row] = await sql<Row[]>`select * from users where id = ${id}`;
      return row && toStoredUser(row);
    },
    async setPasswordHash(userId, passwordHash) {
      const [row] = await sql<Row[]>`
        update users
        set password_hash = ${passwordHash}, token_version = token_version + 1
        where id = ${userId}
        returning *
      `;
      if (row === undefined) {
        throw new Error(`No user ${userId}`);
      }
      return toStoredUser(row);
    },
    async endSessions(userId) {
      const [row] = await sql<Row[]>`
        update users
        set token_version = token_version + 1
        where id = ${userId}
        returning *
      `;
      if (row === undefined) {
        throw new Error(`No user ${userId}`);
      }
      return toStoredUser(row);
    },
    async markEmailVerified(userId) {
      await sql`update users set email_verified = true where id = ${userId}`;
    },
    async insertVerification({ userId, tokenHash, expiresAt }) {
      await sql`
        insert into email_verifications (token_hash, user_id, expires_at)
        values (${tokenHash}, ${userId}, ${expiresAt})
      `;
    },
    async takeVerification(tokenHash) {
      const [row] = await sql<{ user_id: string; expires_at: Date }[]>`
        delete from email_verifications
        where token_hash = ${tokenHash}
        returning user_id, expires_at
      `;
      return row && { userId: row.user_id, expiresAt: row.expires_at };
    },
  };
}
