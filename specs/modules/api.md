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

## Public surface

| Export      | Kind     | Summary                                 |
| ----------- | -------- | --------------------------------------- |
| `createApp` | function | Returns the Hono app, not yet listening |

## Examples

### API-1: GET /health returns the Health body

- **Input:** `GET /health`
- **Expected:** `200`, `{ status: "ok", service: "api" }`

### API-2: An unknown route returns not_found

- **Input:** `GET /nope`
- **Expected:** `404`, `ApiError` with `code: "not_found"`

### API-3: A crash returns internal_error and hides the cause

- **Input:** a route that throws `Error("database password is hunter2")`
- **Expected:** `500`, `ApiError` with `code: "internal_error"`, and the body
  does not contain the thrown message

## Invariants

- None yet.

## Errors

| Situation        | Result                                                        |
| ---------------- | ------------------------------------------------------------- |
| No route matches | `404`, `code: "not_found"`                                    |
| A handler throws | `500`, `code: "internal_error"`; cause logged, never returned |

## Open questions

- None.
