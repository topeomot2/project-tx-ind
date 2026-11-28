---
id: API
status: approved
contracts: [ApiError, Health]
---

# Api app

Where it lives: `apps/api`

## Purpose

Builds the HTTP app (`createApp`) separately from starting it
(`server.ts`), so it can be tested without opening a port.

## Interface

Everything a caller must know to use this module. Tests use only this.

### Exports

| Export      | Kind     | Summary                                                          |
| ----------- | -------- | ---------------------------------------------------------------- |
| `createApp` | function | `createApp({ db, accounts })`: the Hono app, not yet listening   |
| `Db`        | type     | What the app needs from its database (the seam)                  |
| `parseEnv`  | function | Reads `PORT`, `DATABASE_URL` and `JWT_SECRET`; throws if invalid |

### Error modes

| Situation                                                  | Result                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| No route matches                                           | `404`, `code: "not_found"`                                     |
| A handler throws                                           | `500`, `code: "internal_error"`; cause logged, never returned  |
| Database down on `/ready`                                  | `503`, `code: "not_ready"`                                     |
| Invalid env                                                | `parseEnv` throws; the server does not start                   |
| Body that is not valid JSON or does not match its contract | `400`, `code: "validation_failed"`; `details` names the fields |

The user routes (`POST /users`, `POST /sessions`,
`PUT /users/me/password`) are thin: they parse the body with the
contract, call `accounts` (`specs/modules/accounts.md`) and map its result
to HTTP as `specs/product/users.md` says. They are tested by the E2E
tests for that spec.

### Configuration

- `PORT`: port to listen on. Default `3000`.
- `DATABASE_URL`: Postgres connection URL. Default
  `postgres://app:app@localhost:5432/app`, matching `compose.yaml`.

Both are read by `server.ts` through `parseEnv`, never by `createApp`.
`server.ts` also runs the account store's `migrate()` before it listens.

- `JWT_SECRET`: the key that signs tokens, at least 32 characters.
  Required, no default: the server does not start without it.

`parseEnv` examples below (API-7 to API-9) set a valid `JWT_SECRET`
unless they say otherwise, and it appears in the result.

## Examples

### API-1: GET /health returns the Health body

- **Input:** `GET /health`
- **Expected:** `200`, `{ status: "ok", app: "api" }`

### API-2: An unknown route returns not_found

- **Input:** `GET /nope`
- **Expected:** `404`, `ApiError` with `code: "not_found"`

### API-3: A crash returns internal_error and hides the cause

- **Input:** a route that throws `Error("database password is hunter2")`
- **Expected:** `500`, `ApiError` with `code: "internal_error"`, and the body
  does not contain the thrown message

### API-4: GET /ready reports ready when the database answers

- **Input:** `GET /ready`, with a `Db` that is reachable
- **Expected:** `200`, `{ status: "ok", app: "api" }`

### API-5: GET /ready returns not_ready when the database does not answer

- **Input:** `GET /ready`, with a `Db` that is not reachable
- **Expected:** `503`, `ApiError` with `code: "not_ready"`

### API-6: GET /health does not depend on the database

- **Input:** `GET /health`, with a `Db` that is not reachable
- **Expected:** `200`

### API-7: parseEnv uses defaults that match compose.yaml

- **Input:** no variables set
- **Expected:** `{ PORT: 3000, DATABASE_URL: "postgres://app:app@localhost:5432/app" }`

### API-8: parseEnv reads the variables when set

- **Input:** `PORT="8080"`, `DATABASE_URL="postgres://u:p@db:5432/x"`
- **Expected:** `{ PORT: 8080, DATABASE_URL: "postgres://u:p@db:5432/x" }`

### API-9: parseEnv rejects invalid settings

- **Input:** `PORT` of `"zero"` or `"0"`, or a `DATABASE_URL` that is not a URL
- **Expected:** throws

### API-10: parseEnv requires a JWT_SECRET of at least 32 characters

- **Input:** no `JWT_SECRET`; a 31-character one; a 32-character one
- **Expected:** throws; throws; returns it as `JWT_SECRET`

## Invariants

- None yet.

## Open questions

- None.
