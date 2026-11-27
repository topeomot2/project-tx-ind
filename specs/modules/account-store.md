---
id: STORE
status: draft
contracts: []
---

# Postgres account store

Where it lives: `apps/api/src/account-store.ts`

## Purpose

Fills the `AccountStore` seam (see `specs/modules/accounts.md`) with
Postgres tables, and creates them. Knows nothing about passwords, tokens
or HTTP: it stores the hashes it is given.

## Interface

Everything a caller must know to use this module. Tests use only this.

### Exports

| Export                       | Kind     | Summary                                                                             |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `createPostgresAccountStore` | function | `createPostgresAccountStore(url)`: an `AccountStore` plus `migrate()` and `close()` |

- `migrate()`: creates the `users` and `sessions` tables if they are
  missing. Safe to run more than once, and at every start.
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
- Deleting a user deletes their sessions.

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
- **Expected:** both find `{ id, name: "Store Two", email: "store2@example.com", passwordHash: "h1" }`,
  with a UUID `id`

### STORE-3: Inserting an email twice says email_taken

- **Input:** insert `store3@example.com` twice
- **Expected:** the second returns `"email_taken"`

### STORE-4: Unknown users and sessions are not found

- **Input:** `findUserByEmail("nobody@example.com")`,
  `findUserById(<a new UUID>)`, `findSession("no-such-hash")`
- **Expected:** `undefined` each time

### STORE-5: A new password hash replaces the old one

- **Input:** insert a user with `"h1"`, `setPasswordHash(id, "h2")`, find it
- **Expected:** `passwordHash: "h2"`

### STORE-6: A session that was inserted can be found, with its time intact

- **Input:** `insertSession({ tokenHash: "t1", userId, expiresAt: 2026-11-28T12:00:00.123Z })`,
  then `findSession("t1")`
- **Expected:** the same `tokenHash`, `userId` and `expiresAt` (to the
  millisecond)

### STORE-7: deleteSessionsExcept removes only the user's other sessions

- **Input:** user A has sessions `a1`, `a2`; user B has `b1`;
  `deleteSessionsExcept(A, "a1")`
- **Expected:** `a1` and `b1` are found, `a2` is not

## Invariants

- None yet.

## Open questions

- NEEDS_CLARIFICATION (migrations): `migrate()` with
  `create table if not exists`, run by `server.ts` at start (assumed), or
  a migration tool with numbered files? The simple way is fine for two
  tables but has no story for changing a column later.
