import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { createApiClient } from "./client.ts";
import { createSessionStore } from "./session.ts";
import "./styles.css";

// specs/modules/web.md: the api's base URL is set at build time.
const apiUrl = (
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "http://localhost:3000"
).replace(/\/+$/, "");

const client = createApiClient({
  baseUrl: apiUrl,
  fetch: (input, init) => fetch(input, init),
});
const session = createSessionStore({
  storage: localStorage,
  now: () => new Date(),
});

const root = document.getElementById("root");
if (root === null) {
  throw new Error("index.html has no #root");
}
createRoot(root).render(
  <StrictMode>
    <App client={client} session={session} />
  </StrictMode>,
);
