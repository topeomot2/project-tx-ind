import {
  ChangePasswordRequestSchema,
  LogInRequestSchema,
  RegisterRequestSchema,
  type ApiError,
  type Health,
  type Session,
  type User,
} from "@repo/contracts";
import { Hono } from "hono";
import { z } from "zod";
import type { Accounts } from "./accounts.ts";
import type { Db } from "./db.ts";
import type { Verification } from "./verification.ts";

export interface AppDeps {
  db: Db;
  accounts: Accounts;
  verification: Verification;
  /** Origins allowed by CORS (specs/product/web-access.md). */
  webOrigins: readonly string[];
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
    const body = await parseBody(c.req.raw, RegisterRequestSchema);
    if (!body.ok) {
      return c.json(body.error, 400);
    }
    const result = await accounts.register(body.value);
    if (!result.ok) {
      return c.json(
        {
          code: "email_taken",
          message: "An account with this email exists.",
        } satisfies ApiError,
        409,
      );
    }
    return c.json(result.value satisfies User, 201);
  });

  app.post("/sessions", async (c) => {
    const body = await parseBody(c.req.raw, LogInRequestSchema);
    if (!body.ok) {
      return c.json(body.error, 400);
    }
    const result = await accounts.logIn(body.value);
    if (!result.ok) {
      return c.json(invalidCredentials, 401);
    }
    return c.json(result.value satisfies Session);
  });

  app.put("/users/me/password", async (c) => {
    const token = /^Bearer (\S+)$/.exec(
      c.req.header("authorization") ?? "",
    )?.[1];
    if (token === undefined) {
      return c.json(unauthenticated, 401);
    }
    const body = await parseBody(c.req.raw, ChangePasswordRequestSchema);
    if (!body.ok) {
      return c.json(body.error, 400);
    }
    const result = await accounts.changePassword(token, body.value);
    if (!result.ok) {
      return c.json(
        result.code === "unauthenticated"
          ? unauthenticated
          : invalidCredentials,
        401,
      );
    }
    return c.json(result.value satisfies Session);
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

/** One body for every failed log in, so it does not say which part was wrong. */
const invalidCredentials: ApiError = {
  code: "invalid_credentials",
  message: "The email or password is wrong.",
};

const unauthenticated: ApiError = {
  code: "unauthenticated",
  message: "A valid bearer token is needed.",
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: ApiError };

/** Reads a JSON body and parses it with its contract. */
async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<Parsed<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return {
      ok: false,
      error: { code: "validation_failed", message: "The body is not JSON." },
    };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      error: {
        code: "validation_failed",
        message: "The body does not match its contract.",
        details: z.flattenError(result.error).fieldErrors,
      },
    };
  }
  return { ok: true, value: result.data };
}
