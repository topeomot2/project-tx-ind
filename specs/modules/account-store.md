---
id: STORE
status: approved
contracts: []
---

# Postgres account store

Where it lives: `apps/api/src/account-store.ts`

## Purpose

Fills the `AccountStore` seam (see `specs/modules/accounts.md`) with a
Postgres `users` table and an `email_verifications` table, and creates
them. Knows nothing about passwords,
tokens or HTTP: it stores the hash it is given.

## Interface

Everything a caller must know to use this module. Tests use only this.

### Exports

| Export                       | Kind     | Summary                                                                             |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `createPostgresAccountStore` | function | `createPostgresAccountStore(url)`: an `AccountStore` plus `migrate()` and `close()` |

- `migrate()`: creates the tables if they are missing, and adds the
  `email_verified` column (default `false`) to an older `users` table. Safe to run
  more than once, and at every start.
- `close()`: closes all connections.
- Every `AccountStore` method behaves as `accounts.md` says.

### Error modes

| Situation                           | Result                            |
| ----------------------------------- | --------------------------------- |
| `insertUser` with an existing email | returns `"email_taken"`; no throw |
| Database not reachable              | the method throws                 |
| A method before `migrate()`         | the method throws                 |

### Configuration

- Connects lazily, on the first query. At most 5 connections; gives up
  connecting after 2 seconds (as `db.ts`).
- Opens its own connection pool, separate from `Db`.

## Examples

These are integration tests against a real Postgres started from
`compose.yaml`. Each test uses its own emails, so tests do not depend on
each other.

### STORE-1: Migrate can run twice

- **Input:** `migrate()`, then `migrate()` again
- **Expected:** neither throws

### STORE-2: A user that was inserted can be found by email and by id

- **Input:** `insertUser({ name: "Store Two", email: "store2@example.com", passwordHash: "h1" })`,
  then `findUserByEmail` and `findUserById` with its result
- **Expected:** both find
  `{ id, name: "Store Two", email: "store2@example.com", passwordHash: "h1", tokenVersion: 0, emailVerified: false }`,
  with a UUID `id` (`emailVerified` added 2026-11-28 with
  `email-verification.md`)

### STORE-3: Inserting an email twice says email_taken

- **Input:** insert `store3@example.com` twice
- **Expected:** the second returns `"email_taken"`

### STORE-4: Unknown users are not found

- **Input:** `findUserByEmail("nobody@example.com")`,
  `findUserById(<a new UUID>)`
- **Expected:** `undefined` each time

### STORE-5: A new password hash replaces the old one and bumps the token version

- **Input:** insert a user with `"h1"`, `setPasswordHash(id, "h2")`, then
  find it
- **Expected:** `setPasswordHash` and the find both give
  `passwordHash: "h2"` and `tokenVersion: 1`

### STORE-6: Ending sessions bumps the token version and keeps the hash

- **Input:** insert a user with `"h1"`, `endSessions(id)`, then find it
- **Expected:** `endSessions` and the find both give `passwordHash: "h1"`
  and `tokenVersion: 1`

### STORE-7: Marking the email verified shows on the user

- **Input:** insert a user, `markEmailVerified(id)`, then find it
- **Expected:** `emailVerified: true`, other fields unchanged

### STORE-8: A verification can be taken once

- **Input:** insert a user;
  `insertVerification({ userId: id, tokenHash: "t8", expiresAt: 2026-11-28T12:00:00.000Z })`;
  `takeVerification("t8")` twice; `takeVerification("unknown")`
- **Expected:** `{ userId: id, expiresAt: <that Date> }`; `undefined`;
  `undefined`

## Invariants

- None yet.

## Open questions

- None. `migrate()` with `create table if not exists`, run by `server.ts`
  at start, agreed by Temitope on 2026-11-27.
