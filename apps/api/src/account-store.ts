import type { AccountStore } from "./accounts.ts";

/** The Postgres adapter for AccountStore, plus table setup and shutdown. */
export interface PostgresAccountStore extends AccountStore {
  /** Creates the users table if it is missing. Safe to run at every start. */
  migrate(): Promise<void>;
  /** Closes all connections. */
  close(): Promise<void>;
}

/** Stub: the implementation follows specs/modules/account-store.md. */
export const createPostgresAccountStore: (
  url: string,
) => PostgresAccountStore = () => {
  const notImplemented = () => Promise.reject(new Error("NotImplemented"));
  return {
    migrate: notImplemented,
    close: () => Promise.resolve(),
    insertUser: notImplemented,
    findUserByEmail: notImplemented,
    findUserById: notImplemented,
    setPasswordHash: notImplemented,
  };
};
