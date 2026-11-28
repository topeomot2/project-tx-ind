import type { SessionStorage } from "../session.ts";

/**
 * In-memory adapter for the browser storage seam, shared by the session
 * store's unit and property tests. `items` shows what is stored.
 *
 * Locked like the tests: only spec and test work changes it.
 */
export function memoryStorage(): SessionStorage & {
  items: Map<string, string>;
} {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}
