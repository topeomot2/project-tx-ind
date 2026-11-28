---
id: WAPP
status: draft
contracts: []
---

# Web app

Where it lives: `apps/web`

## Purpose

The React app that shows the pages in `specs/product/web.md`. It is built
and served by Vite, and reaches the api through Vite's proxy. The pages
are checked by the E2E tests for that spec; the logic behind them lives in
three small modules with their own specs: `web-client.md` (talks to the
api), `web-session.md` (keeps the session) and `web-forms.md` (checks the
register form).

## Interface

### Exports

None: it is an app. `src/main.tsx` mounts it on `index.html`.

### Error modes

| Situation                                    | Result                                            |
| -------------------------------------------- | ------------------------------------------------- |
| The api answers in a way the client throws   | The page shows "Something went wrong. Try again." |
| The saved session is expired or not accepted | The visitor is sent to `/login`                   |

### Configuration

- `pnpm --filter @repo/web dev`: Vite dev server on port `5173`.
- `pnpm --filter @repo/web start`: builds, then serves the build with
  `vite preview` on port `5173`. The E2E tests use this.
- `API_URL`: where the proxy sends `/api/*`, with `/api` taken off.
  Default `http://localhost:3000`, the api's default.

## Examples

None: the pages are checked by E2E tests (`specs/product/web.md`).

## Invariants

- None.

## Safeguards

- None beyond `specs/product/web.md`.

## Open questions

- None.
