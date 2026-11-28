import { useSyncExternalStore } from "react";

/** Moves to another page of the app without reloading it. */
export function navigate(path: string, { replace = false } = {}): void {
  if (replace) {
    history.replaceState(null, "", path);
  } else {
    history.pushState(null, "", path);
  }
  dispatchEvent(new PopStateEvent("popstate"));
}

function subscribe(onChange: () => void): () => void {
  addEventListener("popstate", onChange);
  return () => {
    removeEventListener("popstate", onChange);
  };
}

/**
 * The current path, kept up to date as the visitor moves around. A child
 * page may navigate before this subscribes; React then re-reads the path.
 */
export function usePath(): string {
  return useSyncExternalStore(subscribe, () => location.pathname);
}
