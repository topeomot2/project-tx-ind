---
id: EVER
status: approved
contracts: [User]
---

# Email verification

Where it lives: `apps/api/src/verification.ts`

## Purpose

Sends verification links and checks them: makes a token, stores its hash
with an expiry through the `AccountStore` seam, emails the link through
the `Mailer` seam, and marks the email verified when a token comes back.
It knows nothing about HTTP; the routes in `specs/product/email-verification.md`
call it. Logging in refuses unverified users in `accounts.ts` (ACC-16).

## Interface

### Exports

| Export               | Kind     | Summary                                                                |
| -------------------- | -------- | ---------------------------------------------------------------------- |
| `createVerification` | function | `createVerification({ store, mailer, now, webUrl })`: a `Verification` |
| `Verification`       | type     | `sendLink(user)`, `verify(token)`, `resend(email)` (below)             |

`Verification` (all async):

| Method           | Does                                                                                                    | Returns                         |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `sendLink(user)` | Makes a token, stores its hash with `expiresAt` 24 hours after `now()`, emails the link to `user.email` | `void`                          |
| `verify(token)`  | Takes the stored token (so it works once); if it has not expired, marks the user verified               | `Result<null, "invalid_token">` |
| `resend(email)`  | If an unverified user has that email (in any case), does `sendLink`; otherwise nothing                  | `void`                          |

The email: to `user.email`, subject `"Verify your email"`, a plain-text
body holding the link `<webUrl>/verify-email?token=<token>` once.

`AccountStore` gains (see `accounts.md`):

| Method                                                 | Does                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `insertVerification({ userId, tokenHash, expiresAt })` | Stores one link                                             |
| `takeVerification(tokenHash)`                          | Deletes and returns `{ userId, expiresAt }`, or `undefined` |
| `markEmailVerified(userId)`                            | Sets `emailVerified: true`                                  |

`Mailer` (`mailer.md`): `send({ to, subject, text })`.

### Error modes

| Situation                      | Result                                 |
| ------------------------------ | -------------------------------------- |
| Unknown, used or expired token | `{ ok: false, code: "invalid_token" }` |
| The store or the mailer throws | The error is passed on to the caller   |

### Configuration

- `webUrl`: the web app's base URL, such as `http://localhost:5173`, with
  no trailing `/`. `server.ts` reads it from `WEB_URL`.

## Examples

Unit tests use the shared in-memory store, a fake mailer that records each
email, and a fixed clock.

### EVER-1: Send link emails one link to the user

- **Input:** `sendLink(ada)` with `webUrl: "http://web.test"`
- **Expected:** one email to `ada@example.com`, subject
  `"Verify your email"`, whose text holds exactly one
  `http://web.test/verify-email?token=<token>` with a non-empty token

### EVER-2: The token from the link verifies the user once

- **Input:** `verify(<token from EVER-1>)` twice
- **Expected:** `{ ok: true, value: null }`, and the stored user is now
  verified; then `{ ok: false, code: "invalid_token" }`

### EVER-3: A link expires after 24 hours

- **Input:** send at `2026-11-27T12:00:00.000Z`; one link verified at
  `2026-11-28T11:59:59.000Z`, another at `2026-11-28T12:00:00.000Z`
- **Expected:** `ok`; `{ ok: false, code: "invalid_token" }`

### EVER-4: An unknown token is invalid

- **Input:** `verify("never-sent")`
- **Expected:** `{ ok: false, code: "invalid_token" }`

### EVER-5: Resend sends only to unverified users

- **Input:** `resend("ADA@example.com")` for an unverified Ada; `resend`
  for a verified user; `resend("nobody@example.com")`
- **Expected:** one new email to `ada@example.com`; no email; no email

### EVER-6: The store never sees the token

- **Input:** `sendLink`, then `verify` with the emailed token, recording
  every value the store receives
- **Expected:** no recorded value contains the token

## Invariants

### EVER-7: Every link is different

For 2 to 5 `sendLink` calls for one user at the same `now()`, all the
tokens differ.

## Safeguards

- Tokens are 32 bytes from `crypto.randomBytes`, base64url: randomness
  cannot be checked by a fast test.
- The stored hash is SHA-256 of the token: EVER-6 proves the token is not
  stored, but not which hash is used.

## Open questions

- None. Answers are in `specs/product/email-verification.md`.
