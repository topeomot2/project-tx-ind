import postgres from "postgres";

/** What the api needs from its database. The seam for tests. */
export interface Db {
  /** True if the database answers a query now. Never throws. */
  isReachable(): Promise<boolean>;
  /** Closes all connections. */
  close(): Promise<void>;
}

/** The Postgres adapter for `Db`. Connects lazily, on first use. */
export function createPostgresDb(url: string): Db {
  const sql = postgres(url, {
    max: 5,
    connect_timeout: 2,
    onnotice: () => undefined,
  });

  return {
    async isReachable() {
      try {
        await sql`select 1`;
        return true;
      } catch {
        return false;
      }
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}
