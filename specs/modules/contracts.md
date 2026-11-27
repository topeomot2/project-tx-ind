---
id: CON
status: approved
contracts: [ApiError, Health]
---

# Contracts

Where it lives: `packages/contracts`

## Purpose

The shared shapes apps exchange, each as a Zod schema with its type derived
by `z.infer`. Shapes only: no business logic, no I/O.

## Interface

Everything a caller must know to use this module. Tests use only this.

### Exports

| Export           | Kind   | Summary                              |
| ---------------- | ------ | ------------------------------------ |
| `ApiErrorSchema` | schema | The one error body every app returns |
| `ApiError`       | type   | `z.infer<typeof ApiErrorSchema>`     |
| `HealthSchema`   | schema | Body of `GET /health`                |
| `Health`         | type   | `z.infer<typeof HealthSchema>`       |

`ApiError` fields:

- `code`: lowercase letters, digits and `_`, starting with a letter.
  Stable; callers branch on it.
- `message`: non-empty text for humans. May change; never branch on it.
- `details` (optional): an object of extra, structured information.

### Error modes

| Situation                | Result                              |
| ------------------------ | ----------------------------------- |
| `parse` on bad input     | throws a `ZodError`                 |
| `safeParse` on bad input | returns `{ success: false, error }` |

### Configuration

- None.

## Examples

### CON-1: ApiError accepts a code and a message

- **Input:** `{ code: "not_found", message: "No order with that id." }`
- **Expected:** valid

### CON-2: ApiError accepts structured details

- **Input:** `{ code: "validation_failed", message: "...", details: { field: "email" } }`
- **Expected:** valid

### CON-3: ApiError rejects badly formed codes

- **Input:** `code` of `"NotFound"`, `"not-found"`, `"1_bad"`, `""` or
  `"has space"`
- **Expected:** invalid

### CON-4: ApiError rejects an empty message

- **Input:** `{ code: "oops", message: "" }`
- **Expected:** invalid

### CON-5: Health accepts an ok status with an app name

- **Input:** `{ status: "ok", app: "api" }`
- **Expected:** valid

### CON-6: Health rejects anything else

- **Input:** `status` other than `"ok"`, an empty `app`, or a missing `app`
- **Expected:** invalid

## Invariants

### CON-7: Every valid ApiError is accepted unchanged

For every value with a valid `code`, a non-empty `message` and optional
JSON `details`, parsing returns the same data.

### CON-8: A valid ApiError survives the wire as JSON

For every valid `ApiError`, the value received after
`JSON.parse(JSON.stringify(error))` is still accepted, and parsing returns
what was received.

### CON-9: Any code outside the allowed pattern is rejected

For every non-empty string that is not lowercase letters, digits and `_`
starting with a letter, an `ApiError` with that `code` is invalid.

## Open questions

- None.
