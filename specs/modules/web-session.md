---
id: WSES
status: approved
contracts: [Session]
---

# Web session store

Where it lives: `apps/web/src/session.ts`

## Purpose

Keeps the logged-in visitor's `Session` in browser storage, so a reload
keeps them logged in, and forgets it once it has expired. It does not ask
the api whether the token is still accepted; the app does that with
`me` (`web-client.md`).

## Interface

### Exports

| Export               | Kind     | Summary                                                  |
| -------------------- | -------- | -------------------------------------------------------- |
| `createSessionStore` | function | `createSessionStore({ storage, now })`: a `SessionStore` |
| `SessionStore`       | type     | `save(session)`, `token()`, `clear()`                    |

- `storage` has `getItem`, `setItem` and `removeItem`, like the browser's
  `localStorage`, which the app passes. `now: () => Date` is the clock.
- `save(session: Session)`: keeps the session, replacing any older one.
- `token(): string | undefined`: the saved token while `now()` is before
  its `expiresAt`; otherwise `undefined`.
- `clear()`: forgets the session.
- Everything is kept under the one storage key `"session"`, so two stores
  over the same storage (two page loads) see the same session.

### Error modes

| Situation                                       | Result                                            |
| ----------------------------------------------- | ------------------------------------------------- |
| Nothing saved                                   | `token()` is `undefined`                          |
| The saved value is not JSON, or not a `Session` | `token()` is `undefined` and the value is removed |
| `now()` is at or after `expiresAt`              | `token()` is `undefined` and the value is removed |

### Configuration

- None.

## Examples

Unit tests use an in-memory storage written in the test file and a fixed
clock.

### WSES-1: A saved session gives its token until it expires

- **Input:** save a `Session` with `expiresAt: "2026-11-28T12:00:00.000Z"`;
  `token()` at `2026-11-28T11:59:59.999Z`, and at
  `2026-11-28T12:00:00.000Z`
- **Expected:** the token; `undefined`, and the storage no longer holds
  `"session"`

### WSES-2: Clear forgets the session

- **Input:** save a session, `clear()`, `token()`
- **Expected:** `undefined`

### WSES-3: A new store over the same storage sees the session

- **Input:** save a session with one store, then `token()` on a second
  store made over the same storage
- **Expected:** the token

### WSES-4: A missing or damaged value gives no token

- **Input:** `token()` with nothing saved; with `"session"` set to
  `"not json"`; with it set to `"{\"token\":\"x\"}"`
- **Expected:** `undefined` each time, and the damaged values are removed

## Invariants

### WSES-5: The token is there exactly while the session lasts

For every valid `Session` and every `now()` from an hour before to an
hour after its `expiresAt`, `token()` gives the token exactly when
`now()` is before `expiresAt`.

## Safeguards

- None.

## Open questions

- None.
