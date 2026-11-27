---
id: DB
status: approved
contracts: []
---

# Postgres adapter

Where it lives: `apps/api/src/db.ts`

## Purpose

Fills the api's `Db` seam with a real Postgres connection. Knows nothing
about HTTP.

## Interface

Everything a caller must know to use this module. Tests use only this.

### Exports

| Export             | Kind     | Summary                                      |
| ------------------ | -------- | -------------------------------------------- |
| `createPostgresDb` | function | `createPostgresDb(url)`: a `Db` for Postgres |

### Error modes

| Situation              | Result                                    |
| ---------------------- | ----------------------------------------- |
| Database not reachable | `isReachable()` returns `false`; no throw |

### Configuration

- Connects lazily, on the first query. At most 5 connections; gives up
  connecting after 2 seconds.

## Examples

These are integration tests: they run against a real Postgres started from
`compose.yaml`.

### DB-1: Reachable when Postgres is running

- **Input:** the URL of a running Postgres
- **Expected:** `isReachable()` is `true`

### DB-2: Not reachable, without throwing, when nothing listens

- **Input:** a URL where nothing listens
- **Expected:** `isReachable()` is `false`

## Invariants

- None yet.

## Open questions

- None.
