---
id: ACC
status: approved
contracts: [RegisterRequest, User, LogInRequest, Session, ChangePasswordRequest]
---

# Accounts

Where it lives: `apps/api/src/accounts.ts`

## Purpose

Everything about users and tokens that is not HTTP and not SQL:
registering, logging in, checking a token and changing a password. The
api's routes call it; it stores users through the `AccountStore` seam,
hashes passwords with `password.ts` and signs tokens as JWTs. Input is
already parsed with the contracts; this module does not validate shapes
again.

## Interface

Everything a caller must know to use this module. Tests use only this.

### Exports

| Export           | Kind     | Summary                                                       |
| ---------------- | -------- | ------------------------------------------------------------- |
| `createAccounts` | function | `createAccounts({ store, now, jwtSecret })`: an `Accounts`    |
| `Accounts`       | type     | `register`, `logIn`, `authenticate`, `changePassword` (below) |
| `AccountStore`   | type     | What accounts needs from storage (the seam)                   |
| `StoredUser`     | type     | `{ id, name, email, passwordHash, tokenVersion }`             |
| `Result`         | type     | `{ ok: true, value } \| { ok: false, code }`                  |

`Accounts` (all async):

| Method                                         | Returns                                                       |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `register(RegisterRequest)`                    | `Result<User, "email_taken">`                                 |
| `logIn(LogInRequest)`                          | `Result<Session, "invalid_credentials">`                      |
| `authenticate(token)`                          | `User \| undefined`                                           |
| `changePassword(token, ChangePasswordRequest)` | `Result<Session, "unauthenticated" \| "invalid_credentials">` |

`now: () => Date` is the clock, `store: AccountStore` the storage, and
`jwtSecret: string` the HS256 signing key.

`AccountStore` (all async):

| Method                                      | Does                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `insertUser({ name, email, passwordHash })` | Adds a user with a new UUID and `tokenVersion: 0`; returns `StoredUser`, or `"email_taken"` |
| `findUserByEmail(email)`                    | `StoredUser \| undefined`; exact match                                                      |
| `findUserById(id)`                          | `StoredUser \| undefined`                                                                   |
| `setPasswordHash(userId, passwordHash)`     | Replaces the hash and adds 1 to `tokenVersion`; returns the updated `StoredUser`            |

Rules a caller can rely on:

- Emails are lowercased before they are stored or looked up, so they
  compare without case.
- A token is a JWT signed with HS256 and `jwtSecret`. Its claims are `sub`
  (the user id), `ver` (the user's `tokenVersion`), `iat`, `exp` (24 hours
  after `now()` at log in) and `jti` (random, so no two tokens are the
  same). Callers must not depend on the claims; they may change.
- `authenticate` accepts a token only if the signature is right, `now()`
  is before `exp`, the user still exists and `ver` equals the user's
  `tokenVersion`. Expiry is checked against `now()`, not the real clock.
- A password change bumps `tokenVersion`, so every token issued before it
  stops working, including the one that made the change. The change
  returns a new `Session` instead.
- The store only ever gets a password hash, never the password.

### Error modes

| Situation                                                         | Result                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Register an email that exists, in any case                        | `{ ok: false, code: "email_taken" }`                                           |
| Log in with a wrong password or unknown email                     | `{ ok: false, code: "invalid_credentials" }`                                   |
| Token malformed, wrongly signed, expired or from an older version | `authenticate` returns `undefined`; `changePassword` returns `unauthenticated` |
| Wrong `currentPassword`                                           | `{ ok: false, code: "invalid_credentials" }`, nothing changes                  |
| The store throws                                                  | The error is passed on to the caller                                           |

### Configuration

- `jwtSecret`: at least 32 characters. `server.ts` reads it from
  `JWT_SECRET` through `parseEnv`.

## Examples

Unit tests use an in-memory `AccountStore` written in the test file, a
fixed clock and a fixed test secret.

### ACC-1: Register returns the new user with the email lowercased

- **Input:** `register({ name: "Ada Lovelace", email: "Ada@Example.com", password: "correct horse battery" })`
- **Expected:** `ok`, a `User` with a UUID `id`, `name: "Ada Lovelace"`
  and `email: "ada@example.com"`

### ACC-2: Register refuses an email that exists in another case

- **Input:** register `ada@example.com`, then `ADA@example.com`
- **Expected:** the second gives `{ ok: false, code: "email_taken" }`

### ACC-3: Log in returns a JWT session that lasts 24 hours

- **Input:** `now()` is `2026-11-27T12:00:00.000Z`; log in with the
  registered email (in any case) and password
- **Expected:** `ok`, a valid `Session` with
  `expiresAt: "2026-11-28T12:00:00.000Z"`

### ACC-4: Log in fails the same way for a wrong password and an unknown email

- **Input:** log in as a registered user with a wrong password; log in as
  `nobody@example.com`
- **Expected:** both `{ ok: false, code: "invalid_credentials" }`

### ACC-5: Authenticate accepts the token it issued and nothing else

- **Input:** `authenticate` with the token from a log in; with
  `"not-a-jwt"`; with that token's last character changed; with a token
  made by a second `createAccounts` that has a different `jwtSecret`
- **Expected:** the logged-in `User`, with the name it registered with;
  then `undefined` three times

### ACC-6: A token stops working when it expires

- **Input:** log in at `2026-11-27T12:00:00.000Z`; `authenticate` at
  `2026-11-28T11:59:59.000Z` and at `2026-11-28T12:00:00.000Z`
- **Expected:** the `User`; `undefined`

### ACC-7: Change password replaces the password and returns a new session

- **Input:** `changePassword(token, { currentPassword: old, newPassword: "tr0ub4dor & 3 more" })`
- **Expected:** `ok` with a valid `Session`; logging in with the new
  password succeeds and with the old one gives `invalid_credentials`

### ACC-8: Change password with a wrong current password changes nothing

- **Input:** `changePassword(token, { currentPassword: "wrong password", newPassword: ... })`
- **Expected:** `{ ok: false, code: "invalid_credentials" }`; the old
  password still logs in and `token` still authenticates

### ACC-9: Change password needs a valid token

- **Input:** `changePassword` with `"not-a-jwt"`, and with an expired token
- **Expected:** `{ ok: false, code: "unauthenticated" }` each time

### ACC-10: Change password ends the user's older tokens only

- **Input:** user A logs in twice (`T1`, `T2`), user B once (`T3`); A
  changes the password with `T1` and gets `T4`
- **Expected:** `authenticate` gives `undefined` for `T1` and `T2`, A for
  `T4`, B for `T3`

### ACC-11: The store never sees a password

- **Input:** register, log in and change the password, recording every
  value the in-memory store receives
- **Expected:** no recorded value contains the old or the new password

## Invariants

### ACC-12: Whoever registers can log in

For every valid `RegisterRequest`, registering and then logging in with
the same password and the email in upper case gives `ok`. (Few runs:
hashing is slow.)

### ACC-13: Every log in gets a new token

For any number of log ins (2 to 5) by one user at the same `now()`, all
the tokens differ.

## Safeguards

- `logIn` does the same hashing work whether or not the email has an
  account, so response time does not reveal which emails exist: timing
  tests are not deterministic.

## Open questions

- None. Answers are in `specs/product/users.md`.
