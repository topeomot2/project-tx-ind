---
id: WCL
status: draft
contracts: [ApiError, RegisterRequest, User, LogInRequest, Session]
---

# Web api client

Where it lives: `apps/web/src/client.ts`

## Purpose

The web app's only way to call the api. It sends each request, reads the
answer with its contract and turns the expected failures into results, so
pages never touch `fetch`, status codes or JSON. It does not keep the
session (`web-session.md`) or check form fields (`web-forms.md`).

## Interface

### Exports

| Export            | Kind     | Summary                                               |
| ----------------- | -------- | ----------------------------------------------------- |
| `createApiClient` | function | `createApiClient({ baseUrl, fetch })`: an `ApiClient` |
| `ApiClient`       | type     | `register`, `logIn`, `me`, `logOut` (below)           |
| `Result`          | type     | `{ ok: true, value } \| { ok: false, code }`          |

`fetch` has the shape of the global `fetch`; the app passes the real one
and `baseUrl` from `VITE_API_URL` (`web.md`), such as
`https://api.example.com`. Paths are joined to `baseUrl` as given:
`baseUrl + "/users"`.

`ApiClient` (all async):

| Method                      | Request                                   | Returns                                              |
| --------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `register(RegisterRequest)` | `POST /users`, JSON body                  | `Result<User, "email_taken" \| "validation_failed">` |
| `logIn(LogInRequest)`       | `POST /sessions`, JSON body               | `Result<Session, "invalid_credentials">`             |
| `me(token)`                 | `GET /users/me`, bearer token             | `Result<User, "unauthenticated">`                    |
| `logOut(token)`             | `DELETE /users/me/sessions`, bearer token | `Result<null, "unauthenticated">`                    |

A JSON body is sent with `content-type: application/json`. A bearer token
is sent as `authorization: Bearer <token>`.

### Error modes

| Situation                                                   | Result                                       |
| ----------------------------------------------------------- | -------------------------------------------- |
| `register` gets `409`                                       | `{ ok: false, code: "email_taken" }`         |
| `register` gets `400`                                       | `{ ok: false, code: "validation_failed" }`   |
| `logIn` gets `401`                                          | `{ ok: false, code: "invalid_credentials" }` |
| `me` or `logOut` gets `401`                                 | `{ ok: false, code: "unauthenticated" }`     |
| Any other status, or a success body that fails its contract | throws an `Error`                            |
| `fetch` rejects (network down)                              | the rejection is passed on                   |

### Configuration

- None beyond `baseUrl` and `fetch`.

## Examples

Unit tests pass a fake `fetch` that records each request and answers with
a scripted `Response`, and `baseUrl: "/api"`.

### WCL-1: Register sends the request and returns the new user

- **Input:** `register({ name: "Ada Lovelace", email: "ada@example.com", password: "correct horse battery" })`;
  the fake answers `201` with a valid `User`
- **Expected:** one `POST /api/users` with `content-type: application/json`
  and that body as JSON; `{ ok: true, value: <that User> }`

### WCL-2: Register reports a taken email and an invalid body

- **Input:** the fake answers `409` with `code: "email_taken"`, then `400`
  with `code: "validation_failed"`
- **Expected:** `{ ok: false, code: "email_taken" }`, then
  `{ ok: false, code: "validation_failed" }`

### WCL-3: Log in sends the request and returns the session

- **Input:** `logIn({ email: "ada@example.com", password: "correct horse battery" })`;
  the fake answers `200` with a valid `Session`
- **Expected:** one `POST /api/sessions` with that JSON body;
  `{ ok: true, value: <that Session> }`

### WCL-4: Log in reports wrong credentials

- **Input:** the fake answers `401` with `code: "invalid_credentials"`
- **Expected:** `{ ok: false, code: "invalid_credentials" }`

### WCL-10: Log in reports an unverified email

- **Input:** the fake answers `403` with `code: "email_not_verified"`
- **Expected:** `{ ok: false, code: "email_not_verified" }`

### WCL-11: Verify email sends the token

- **Input:** `verifyEmail("K")`; the fake answers `204`, then `400` with
  `code: "invalid_token"`
- **Expected:** one `POST /api/email-verifications` with JSON
  `{ token: "K" }`; `{ ok: true, value: null }`, then
  `{ ok: false, code: "invalid_token" }`

### WCL-12: Resend sends the email

- **Input:** `resendVerification("ada@example.com")`; the fake answers
  `202`
- **Expected:** one `POST /api/email-verifications/resend` with JSON
  `{ email: "ada@example.com" }`; `null`

### WCL-5: Me sends the token and returns the user

- **Input:** `me("T")`; the fake answers `200` with a valid `User`
- **Expected:** one `GET /api/users/me` with `authorization: Bearer T`;
  `{ ok: true, value: <that User> }`

### WCL-6: Log out sends the token

- **Input:** `logOut("T")`; the fake answers `204` with no body
- **Expected:** one `DELETE /api/users/me/sessions` with
  `authorization: Bearer T`; `{ ok: true, value: null }`

### WCL-7: Me and log out report an invalid session

- **Input:** the fake answers `401` with `code: "unauthenticated"`, to
  `me("T")` and to `logOut("T")`
- **Expected:** `{ ok: false, code: "unauthenticated" }` each time

### WCL-8: A success body that breaks its contract throws

- **Input:** `logIn` and the fake answers `200` with `{ token: "x" }`;
  `me` and it answers `200` with `{ name: "Ada" }`
- **Expected:** both reject with an `Error`

## Invariants

### WCL-9: Unexpected statuses throw

For every method and every status from 200 to 599 that is not in its row
of the tables above (for example `500` for any method, `409` for `logIn`,
`200` for `logOut`), the method rejects with an `Error`.

## Safeguards

- None.

## Open questions

- None.
