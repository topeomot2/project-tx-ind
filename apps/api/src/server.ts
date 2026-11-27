import { serve } from "@hono/node-server";
import { createPostgresAccountStore } from "./account-store.ts";
import { createAccounts } from "./accounts.ts";
import { createApp } from "./app.ts";
import { createPostgresDb } from "./db.ts";
import { parseEnv } from "./env.ts";

const env = parseEnv(process.env);
const db = createPostgresDb(env.DATABASE_URL);
const store = createPostgresAccountStore(env.DATABASE_URL);
// Stub wiring: JWT_SECRET comes from parseEnv (API-10), and the store's
// migrate() runs before listening (specs/modules/api.md).
const accounts = createAccounts({
  store,
  now: () => new Date(),
  jwtSecret: "",
});

const server = serve(
  { fetch: createApp({ db, accounts }).fetch, port: env.PORT },
  (info) => {
    console.log(`api listening on http://localhost:${String(info.port)}`);
  },
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close();
    void db.close();
    void store.close();
  });
}
