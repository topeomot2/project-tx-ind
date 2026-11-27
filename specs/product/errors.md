---
id: ERR
status: approved
contracts: [ApiError]
---

# Error responses

## Why

Callers handle failures by reading one stable `code`, the same way on every
endpoint, instead of parsing messages or guessing from status codes.

## Requirements

### ERR-1: Unknown routes say not_found

- **Given** the api is running
- **When** a caller requests a path the api does not serve, e.g.
  `GET /no-such-route`
- **Then** it gets status `404` and an `ApiError` body with
  `code: "not_found"`

## Out of scope

- Validation errors for request bodies. They arrive with the first endpoint
  that accepts input.

## Open questions

- None.
