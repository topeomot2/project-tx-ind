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

| Export      | Kind     | Summary                                                                                  |
| ----------- | -------- | ---------------------------------------------------------------------------------------- |
| `createApp` | function | `createApp({ db, accounts, verification, webOrigins })`: the Hono app, not yet listening |
| `Db`        | type     | What the app needs from its database (the seam)                                          |
| `parseEnv`  | function | Reads the settings below; throws if invalid                                              |

### Error modes

| Situation                                                  | Result                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| No route matches                                           | `404`, `code: "not_found"`                                     |
| A handler throws                                           | `500`, `code: "internal_error"`; cause logged, never returned  |
| Database down on `/ready`                                  | `503`, `code: "not_ready"`                                     |
| Invalid env                                                | `parseEnv` throws; the server does not start                   |
| Body that is not valid JSON or does not match its contract | `400`, `code: "validation_failed"`; `details` names the fields |

The user routes (`POST /users`, `POST /sessions`,
`PUT /users/me/password`, `GET /users/me`, `DELETE /users/me/sessions`,
`POST /email-verifications`, `POST /email-verifications/resend`) are thin: they parse the body with the
contract, call `accounts` (`specs/modules/accounts.md`) and map its result
to HTTP as `specs/product/users.md` and
`specs/product/email-verification.md` say. CORS for `webOrigins` follows
`specs/product/web-access.md`. They are tested by the E2E
tests for that spec.

### Configuration

- `PORT`: port to listen on. Default `3000`.
- `DATABASE_URL`: Postgres connection URL. Default
  `postgres://app:app@localhost:5432/app`, matching `compose.yaml`.

Both are read by `server.ts` through `parseEnv`, never by `createApp`.
`server.ts` also runs the account store's `migrate()` before it listens.

- `JWT_SECRET`: the key that signs tokens, at least 32 characters.
  Required, no default: the server does not start without it.
- `WEB_URL`: the web app's base URL, used in verification links. Default
  `http://localhost:5173`.
- `WEB_ORIGINS`: comma-separated origins allowed by CORS, parsed into a
  list. Default `http://localhost:5173`.
- `SMTP_URL`: where email goes. Default `smtp://localhost:1025`, Mailpit
  in `compose.yaml`.
- `MAIL_FROM`: the sender address. Default `no-reply@localhost`.

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
  plus the API-11 defaults (added 2026-11-28)

### API-8: parseEnv reads the variables when set

- **Input:** `PORT="8080"`, `DATABASE_URL="postgres://u:p@db:5432/x"`
- **Expected:** `{ PORT: 8080, DATABASE_URL: "postgres://u:p@db:5432/x" }`
  plus the API-11 defaults (added 2026-11-28)

### API-9: parseEnv rejects invalid settings

- **Input:** `PORT` of `"zero"` or `"0"`, or a `DATABASE_URL` that is not a URL
- **Expected:** throws

### API-10: parseEnv requires a JWT_SECRET of at least 32 characters

- **Input:** no `JWT_SECRET`; a 31-character one; a 32-character one
- **Expected:** throws; throws; returns it as `JWT_SECRET`

### API-11: parseEnv reads the web and mail settings

- **Input:** none of them set; then `WEB_URL="https://app.example.com"`,
  `WEB_ORIGINS="https://app.example.com, https://admin.example.com"`,
  `SMTP_URL="smtps://u:p@smtp.example.com:465"`,
  `MAIL_FROM="hello@example.com"`
- **Expected:** `WEB_URL: "http://localhost:5173"`,
  `WEB_ORIGINS: ["http://localhost:5173"]`,
  `SMTP_URL: "smtp://localhost:1025"`, `MAIL_FROM: "no-reply@localhost"`;
  then those values, with `WEB_ORIGINS` as
  `["https://app.example.com", "https://admin.example.com"]`

### API-12: parseEnv rejects bad web and mail settings

- **Input:** `WEB_URL="app"`; `WEB_ORIGINS="not a url"`;
  `MAIL_FROM="nobody"`
- **Expected:** throws each time

## Invariants

- None yet.

## Open questions

- None.
