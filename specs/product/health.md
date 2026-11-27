---
id: HEALTH
status: approved
contracts: [Health]
---

# Health check

## Why

Whatever runs the system (a load balancer, a deploy script, the E2E tests)
needs two cheap calls: `/health` says the process is alive, `/ready` says it
can do real work because its dependencies answer.

## Requirements

### HEALTH-1: The api reports healthy

- **Given** the api is running
- **When** a caller sends `GET /health`
- **Then** it gets status `200` and a `Health` body with `status: "ok"` and
  `app: "api"`

### HEALTH-2: The api reports ready when its database is up

- **Given** the api is running and its database is up
- **When** a caller sends `GET /ready`
- **Then** it gets status `200` and a `Health` body with `status: "ok"` and
  `app: "api"`

## Out of scope

- Reporting _which_ dependency is down. `/ready` answers yes or no.

## Open questions

- None.
