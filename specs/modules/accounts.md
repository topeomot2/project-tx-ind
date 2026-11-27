---
id: ACC
status: draft
contracts: [RegisterRequest, User, LogInRequest, Session, ChangePasswordRequest]
---

# Accounts

Where it lives: `apps/api/src/accounts.ts`

## Purpose

Everything about users and sessions that is not HTTP and not SQL:
registering, logging in, checking a session token and changing a password.
The api's routes call it; it stores data through the `AccountStore` seam
and hashes passwords with `password.ts`. Input is already parsed with the
contracts; this module does not validate shapes again.

## Interface

Everything a caller must know to use this module. Tests use only this.

### Exports

| Export           | Kind     | Summary                                                          |
| ---------------- | -------- | ---------------------------------------------------------------- |
| `createAccounts` | function | `createAccounts({ store, now })`: an `Accounts`                  |
| `Accounts`       | type     | `register`, `logIn`, `authenticate`, `changePassword` (below)    |
| `AccountStore`   | type     | What accounts needs from storage (the seam)                      |
| `StoredUser`     | type     | `{ id, name, email, passwordHash }`, as the store keeps a user   |
| `StoredSession`  | type     | `{ tokenHash, userId, expiresAt: Date }`, as the store keeps one |
| `Result`         | type     | `{ ok: true, value } \| { ok: false, code }`                     |

`Accounts`:

| Method                                         | Returns                                                         |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `register(RegisterRequest)`                    | `Result<User, "email_taken">`                                   |
| `logIn(LogInRequest)`                          | `Result<Session, "invalid_credentials">`                        |
| `authenticate(token)`                          | `User \| undefined`                                             |
| `changePassword(token, ChangePasswordRequest)` | `Result<undefined, "unauthenticated" \| "invalid_credentials">` |

All are async. `now: () => Date` is the clock; `store: AccountStore` is
the storage.

`AccountStore` (all async):

| Method                                      | Does                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `insertUser({ name, email, passwordHash })` | Adds a user with a new UUID; returns `StoredUser`, or `"email_taken"` if the email exists |
| `findUserByEmail(email)`                    | `StoredUser \| undefined`; exact match                                                    |
| `findUserById(id)`                          | `StoredUser \| undefined`                                                                 |
| `setPasswordHash(userId, passwordHash)`     | Replaces the user's hash                                                                  |
| `insertSession(StoredSession)`              | Adds a session                                                                            |
| `findSession(tokenHash)`                    | `StoredSession \| undefined`                                                              |
| `deleteSessionsExcept(userId, tokenHash)`   | Removes the user's sessions other than `tokenHash`                                        |

Rules a caller can rely on:

- Emails are lowercased before they are stored or looked up, so they
  compare without case.
- A session lasts 24 hours from `now()` at log in. `authenticate` treats a
  token as expired from its `expiresAt` on.
- Tokens are 32 random bytes, base64url (43 characters). The store only
  ever gets a SHA-256 hash of a token, never the token, and only a
  password hash, never the password.
- `logIn` does the same hashing work whether or not the email has an
  account, so response time does not reveal which emails exist. (Not
  checked by a test: timing tests are not deterministic.)

### Error modes

| Situation                                     | Result                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| Register an email that exists, in any case    | `{ ok: false, code: "email_taken" }`                                           |
| Log in with a wrong password or unknown email | `{ ok: false, code: "invalid_credentials" }`                                   |
| Unknown or expired token                      | `authenticate` returns `undefined`; `changePassword` returns `unauthenticated` |
| Wrong `currentPassword`                       | `{ ok: false, code: "invalid_credentials" }`, nothing changes                  |
| The store throws                              | The error is passed on to the caller                                           |

### Configuration

- None beyond `store` and `now`.

## Examples

Unit tests use an in-memory `AccountStore` written in the test file, and a
fixed clock.

### ACC-1: Register returns the new user with the email lowercased

- **Input:** `register({ name: "Ada Lovelace", email: "Ada@Example.com", password: "correct horse battery" })`
- **Expected:** `ok`, a `User` with a UUID `id`, `name: "Ada Lovelace"`
  and `email: "ada@example.com"`

### ACC-2: Register refuses an email that exists in another case

- **Input:** register `ada@example.com`, then `ADA@example.com`
- **Expected:** the second gives `{ ok: false, code: "email_taken" }`

### ACC-3: Log in returns a session that lasts 24 hours

- **Input:** `now()` is `2026-11-27T12:00:00.000Z`; log in with the
  registered email (in any case) and password
- **Expected:** `ok`, a `Session` with a 43-character `token` and
  `expiresAt: "2026-11-28T12:00:00.000Z"`

### ACC-4: Log in fails the same way for a wrong password and an unknown email

- **Input:** log in as a registered user with a wrong password; log in as
  `nobody@example.com`
- **Expected:** both `{ ok: false, code: "invalid_credentials" }`

### ACC-5: Authenticate knows a live token and no other

- **Input:** `authenticate` with the token from a log in; with a
  43-character token that was never issued
- **Expected:** the logged-in `User`, with the name it registered with;
  `undefined`

### ACC-6: A token stops working when it expires

- **Input:** log in at `12:00`; `authenticate` at `2026-11-28T11:59:59.999Z`
  and at `2026-11-28T12:00:00.000Z`
- **Expected:** the `User`; `undefined`

### ACC-7: Change password replaces the password

- **Input:** `changePassword(token, { currentPassword: old, newPassword: "tr0ub4dor & 3 more" })`
- **Expected:** `ok`; logging in with the new password succeeds and with
  the old one gives `invalid_credentials`

### ACC-8: Change password with a wrong current password changes nothing

- **Input:** `changePassword(token, { currentPassword: "wrong password", newPassword: ... })`
- **Expected:** `{ ok: false, code: "invalid_credentials" }`; the old
  password still logs in

### ACC-9: Change password needs a live token

- **Input:** `changePassword` with a never-issued token, and with an
  expired one
- **Expected:** `{ ok: false, code: "unauthenticated" }` each time

### ACC-10: Change password ends the user's other sessions only

- **Input:** user A logs in twice (`T1`, `T2`), user B once (`T3`); A
  changes the password with `T1`
- **Expected:** `authenticate` gives A for `T1`, `undefined` for `T2`, B
  for `T3`

### ACC-11: The store never sees a password or a token

- **Input:** register, log in and change the password, recording every
  value the in-memory store receives
- **Expected:** no recorded value contains either password or the token

## Invariants

### ACC-12: Whoever registers can log in

For every valid email and password (per `RegisterRequest`), registering
and then logging in with the same password and the email in upper case
gives `ok`. (Few runs: hashing is slow.)

### ACC-13: Every log in gets a new token

For any number of log ins (2 to 5) by one user, all the tokens differ.

## Open questions

- Follows the answers in `specs/product/users.md` (token lifetime, email
  case, other sessions on a password change).
