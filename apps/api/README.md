# @repo/api

The HTTP app, built on [Hono](https://hono.dev), run by Node directly from the
TypeScript source (no build step).

- `src/app.ts` builds the app; `src/server.ts` only starts it.
- Every error response has the `ApiError` shape from `@repo/contracts`.
- `pnpm --filter @repo/api dev` starts it on `PORT` (default 3000) and
  restarts on change.
