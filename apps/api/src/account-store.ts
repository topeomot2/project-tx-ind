import postgres from "postgres";
import type { AccountStore } from "./accounts.ts";

/** The Postgres adapter for AccountStore, plus table setup and shutdown. */
export interface PostgresAccountStore extends AccountStore {
  /** Creates the users table if it is missing. Safe to run at every start. */
  migrate(): Promise<void>;
  /** Closes all connections. */
  close(): Promise<void>;
}

/** See specs/modules/account-store.md. Connects lazily, on first use. */
export function createPostgresAccountStore(url: string): PostgresAccountStore {
  const sql = postgres(url, {
    max: 5,
    connect_timeout: 2,
    onnotice: () => undefined,
  });
  const notImplemented = () => Promise.reject(new Error("NotImplemented"));

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
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
    insertUser: notImplemented,
    findUserByEmail: notImplemented,
    findUserById: notImplemented,
    setPasswordHash: notImplemented,
  };
}
