import type { ApiError, Health } from "@repo/contracts";
import { Hono } from "hono";

/**
 * Builds the HTTP app without starting a server, so tests can call
 * `app.request()` directly and the entry point (server.ts) stays tiny.
 */
export function createApp(): Hono {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({ status: "ok", service: "api" } satisfies Health),
  );

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
