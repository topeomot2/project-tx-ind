import { serve } from "@hono/node-server";
import { createPostgresAccountStore } from "./account-store.ts";
import { createAccounts } from "./accounts.ts";
import { createApp } from "./app.ts";
import { createPostgresDb } from "./db.ts";
import { parseEnv } from "./env.ts";
import { createSmtpMailer } from "./mailer.ts";
import { createVerification } from "./verification.ts";

const env = parseEnv(process.env);
const db = createPostgresDb(env.DATABASE_URL);
const store = createPostgresAccountStore(env.DATABASE_URL);
await store.migrate();
const accounts = createAccounts({
  store,
  now: () => new Date(),
  jwtSecret: env.JWT_SECRET,
});

// Stub wiring: the implementation reads these from parseEnv (API-11).
const mailer = createSmtpMailer({
  url: "smtp://localhost:1025",
  from: "no-reply@localhost",
});
const verification = createVerification({
  store,
  mailer,
  now: () => new Date(),
  webUrl: "http://localhost:5173",
});

const server = serve(
  {
    fetch: createApp({ db, accounts, verification, webOrigins: [] }).fetch,
    port: env.PORT,
  },
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
