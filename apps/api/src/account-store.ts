import postgres from "postgres";
import type { AccountStore, StoredUser } from "./accounts.ts";

/** The Postgres adapter for AccountStore, plus table setup and shutdown. */
export interface PostgresAccountStore extends AccountStore {
  /** Creates the users table if it is missing. Safe to run at every start. */
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
}

function toStoredUser(row: Row): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    tokenVersion: row.token_version,
  };
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
    setPasswordHash: notImplemented,
  };
}
