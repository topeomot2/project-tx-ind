import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { createPostgresDb } from "./db.ts";
import { parseEnv } from "./env.ts";

const env = parseEnv(process.env);
const db = createPostgresDb(env.DATABASE_URL);

const server = serve(
  { fetch: createApp({ db }).fetch, port: env.PORT },
  (info) => {
    console.log(`api listening on http://localhost:${String(info.port)}`);
  },
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close();
    void db.close();
  });
}
