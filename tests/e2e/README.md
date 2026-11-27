# @repo/e2e

End-to-end tests with Playwright. Each test checks one behaviour from a
product spec in `specs/`, against the running apps.

- Tests live in `src/` and are named `*.spec.ts`.
- They use only the public surface of an app (HTTP API or browser), never
  its internal modules. Shared shapes come from `@repo/contracts`.
- Run with `pnpm test:e2e` from the root. First run on a machine:
  `pnpm --filter @repo/e2e exec playwright install chromium`.
