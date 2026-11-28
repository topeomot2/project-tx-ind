# Testing rules

## Levels

| Test        | Checks                             | Tool                    | Location                       | Gate                    |
| ----------- | ---------------------------------- | ----------------------- | ------------------------------ | ----------------------- |
| Unit        | One example from a module spec     | Vitest                  | `src/**/*.test.ts`             | `pnpm check`            |
| Property    | One invariant from a module spec   | Vitest + fast-check     | `src/**/*.property.test.ts`    | `pnpm check`            |
| Integration | One example against a real service | Vitest + Testcontainers | `src/**/*.integration.test.ts` | `pnpm test:integration` |
| E2E         | One product spec requirement       | Playwright              | `tests/e2e/src/**/*.spec.ts`   | `pnpm test:e2e`         |

E2E tests are the source of truth. Unit and property tests are the fast
inner loop.

## All tests

- **Name starts with the requirement ID:** `it("CON-1: accepts ...")`.
- **Test through the interface.** Call what a caller would call and assert
  on what a caller would see. If a test needs to reach past the interface,
  the module is the wrong shape; say so in a change request.
- **Behaviour, not implementation.** A test should survive any refactor
  that keeps the interface.
- **Arrange, act, assert,** separated by a blank line. One behaviour per test.
- **Deterministic.** No real clock, randomness or network without control:
  pass them in, or fake them.
- **Do not mock your own modules.** Replace a dependency only at a real
  seam, with an adapter (an in-memory fake is best). Mock only what you do
  not own.
- **Shared fakes** live in `src/testing/` of the app or package, e.g.
  `apps/api/src/testing/fake-account-store.ts`. Spec and test work writes
  them, and they are locked like tests. Never copy a fake into a second
  test file: move it there. Production code never imports from
  `src/testing/`.
- **Contracts in assertions:** parse responses with the contract schema
  (`HealthSchema.parse(body)`) so a shape change fails loudly.

## Property tests

- **Generators come from the spec**, not from the schema or code under
  test, so they cannot share its mistakes.
- Prefer building valid inputs over filtering random ones; keep `.filter`
  for rare exclusions.
- `includeErrorInReport` is on for every package (the shared Vitest
  setup), so a failure shows the error that caused it. Do not set it per
  test.
- When a property fails, fast-check prints the smallest counterexample.
  Decide whether the spec or the code is wrong; never just exclude the case
  to get green.

## Integration tests

- Start services with `startServices()` from `@repo/services` in
  `beforeAll`, and `stop()` them in `afterAll`. Never point a test at a
  shared or long-running database.
- Use them for adapters at a seam to a service (e.g. the Postgres adapter).
  Everything above the seam is tested with a fake adapter in unit tests.

## E2E tests

- Use only the apps' interface: HTTP via the `request` fixture, UI via
  `page`. Never import app code; shared shapes come from `@repo/contracts`.
- `pnpm test:e2e` starts the services, then Playwright starts the apps
  (`webServer` in `playwright.config.ts`).
- No fixed waits (`waitForTimeout`). Wait for a condition or a response.
- Each test sets up its own data and does not depend on another test.

## Commands

```sh
pnpm check                                # typecheck, lint, unit + property tests
pnpm test:integration                     # integration (needs Docker)
pnpm test:e2e                             # E2E (needs Docker)
pnpm test:mutation                        # Stryker (slow; report in reports/mutation/)
pnpm --filter @repo/contracts test        # one package
pnpm --filter @repo/api exec vitest       # watch mode
```
