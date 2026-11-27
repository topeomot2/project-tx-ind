---
id: HEALTH
status: approved
contracts: [Health]
---

# Health check

## Why

Whatever runs the system (a load balancer, a deploy script, the E2E tests)
needs one cheap call that says an app is ready to take traffic.

## Requirements

### HEALTH-1: The api reports healthy

- **Given** the api is running
- **When** a caller sends `GET /health`
- **Then** it gets status `200` and a `Health` body with `status: "ok"` and
  `app: "api"`

## Out of scope

- Checking dependencies (database, queues). That will be a separate
  readiness requirement once there are dependencies.

## Open questions

- None.
