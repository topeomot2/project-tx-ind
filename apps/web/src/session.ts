import { SessionSchema, type Session } from "@repo/contracts";

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

const key = "session";

export function createSessionStore({
  storage,
  now,
}: SessionStoreDeps): SessionStore {
  /** The saved session, or undefined if there is none or it is damaged. */
  function saved(): Session | undefined {
    const raw = storage.getItem(key);
    if (raw === null) {
      return undefined;
    }
    try {
      const parsed = SessionSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  }

  return {
    save(session) {
      storage.setItem(key, JSON.stringify(session));
    },
    token() {
      const session = saved();
      if (
        session === undefined ||
        now().getTime() >= Date.parse(session.expiresAt)
      ) {
        storage.removeItem(key);
        return undefined;
      }
      return session.token;
    },
    clear() {
      storage.removeItem(key);
    },
  };
}
