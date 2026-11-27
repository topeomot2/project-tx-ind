# @repo/e2e

End-to-end tests with Playwright. Each test checks one requirement from a
product spec in `specs/product/`, against the running apps, and its name
starts with the requirement ID (e.g. `HEALTH-1: ...`).

- Tests live in `src/` and are named `*.spec.ts`.
- They use only an app's interface (HTTP or browser), never
  its internal modules. Shared shapes come from `@repo/contracts`.
- Run with `pnpm test:e2e` from the root. First run on a machine:
  `pnpm --filter @repo/e2e exec playwright install chromium`.
