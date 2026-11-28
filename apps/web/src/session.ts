import type { Session } from "@repo/contracts";

/** The part of the browser's Storage the session store needs. */
export type SessionStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

/** Keeps the session in storage. See specs/modules/web-session.md. */
export interface SessionStore {
  save(session: Session): void;
  /** The saved token while it has not expired, else undefined. */
  token(): string | undefined;
  clear(): void;
}

export interface SessionStoreDeps {
  storage: SessionStorage;
  now: () => Date;
}

/** Stub: the implementation follows specs/modules/web-session.md. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub: the implementation uses it
export function createSessionStore(_deps: SessionStoreDeps): SessionStore {
  const notImplemented = () => {
    throw new Error("NotImplemented");
  };
  return { save: notImplemented, token: notImplemented, clear: notImplemented };
}
