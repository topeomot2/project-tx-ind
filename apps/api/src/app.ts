import {
  RegisterRequestSchema,
  type ApiError,
  type Health,
  type User,
} from "@repo/contracts";
import { Hono } from "hono";
import type { Accounts } from "./accounts.ts";
import type { Db } from "./db.ts";

export interface AppDeps {
  db: Db;
  accounts: Accounts;
}

/**
 * Builds the HTTP app without starting a server, so tests can call
 * `app.request()` directly and the entry point (server.ts) stays tiny.
 * Dependencies come in as parameters, so tests can pass fakes.
 */
export function createApp({ db, accounts }: AppDeps): Hono {
  const app = new Hono();
  const healthy: Health = { status: "ok", app: "api" };

  // Liveness: the process is up. Never touches dependencies.
  app.get("/health", (c) => c.json(healthy));

  // Readiness: the api can do real work, because its database answers.
  app.get("/ready", async (c) => {
    if (await db.isReachable()) {
      return c.json(healthy);
    }
    return c.json(
      {
        code: "not_ready",
        message: "The database is not reachable.",
      } satisfies ApiError,
      503,
    );
  });

  // User routes: specs/product/users.md.
  app.post("/users", async (c) => {
    const body = RegisterRequestSchema.parse(await c.req.json());
    const result = await accounts.register(body);
    if (!result.ok) {
      throw new Error(result.code);
    }
    return c.json(result.value satisfies User, 201);
  });

  app.notFound((c) =>
    c.json(
      {
        code: "not_found",
        message: `No route for ${c.req.method} ${c.req.path}.`,
      } satisfies ApiError,
      404,
    ),
  );

  app.onError((error, c) => {
    console.error(error);
    // Never leak internals (stack, error.message) to the caller.
    return c.json(
      {
        code: "internal_error",
        message: "Something went wrong.",
      } satisfies ApiError,
      500,
    );
  });

  return app;
}
