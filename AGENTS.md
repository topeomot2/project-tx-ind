# AGENTS.md

How this repo works. Read this first, then the file for your task under
`docs/rules/`.

## Layout

```
apps/<name>/         programs that run: backends, frontends, workers
packages/contracts/  shared Zod schemas + types (locked)
packages/config/     shared tsconfig, ESLint, Prettier, Vitest settings
specs/product/       what callers can observe -> E2E tests (locked, hard)
specs/modules/       one module's interface -> unit + property tests (locked, light)
packages/services/   starts compose.yaml services for tests (Testcontainers)
tests/e2e/           Playwright tests (locked)
compose.yaml         services the apps need (Postgres)
factory.json         manifest: apps, their services, locked paths
docs/GLOSSARY.md     the words we use, and the ones we don't
docs/rules/          typescript.md, tdd.md, testing.md
.agents/skills/      write-specs, implement, tdd-contracts, codebase-design
LICENSES/            notices for adapted third-party text
```

pnpm workspaces + Turborepo, ESM, Node 26 (`.nvmrc`). TypeScript runs
directly in Node; there is no build step. Integration and E2E tests need a
running Docker daemon; set `DATABASE_URL` to use an existing Postgres
instead.

## Commands

```sh
pnpm install
pnpm check              # typecheck + lint + unit/property tests, all packages
pnpm test:integration   # adapters against real services (needs Docker)
pnpm test:e2e           # starts services and apps, runs E2E tests (needs Docker)
pnpm services:up        # Postgres for local dev (pnpm services:down to stop)
pnpm format             # Prettier
pnpm dev                # run apps in watch mode
```

## How work flows

1. A **spec** says what must be true (`specs/`). A human approves it with
   its contracts.
2. **Tests** are written from the spec, each named with a requirement ID,
   and locked. Skill: `write-specs`.
3. **Implementation** makes them pass, one requirement at a time. Skill:
   `implement`.
4. **Review** checks the work and does any refactoring.

Both sides follow `tdd-contracts`. For module and interface design, use
`codebase-design`. The short version is `docs/rules/tdd.md`.

## Locked paths

Implementation work reads these but never edits them:

- `specs/**`
- `packages/contracts/**`
- `tests/e2e/**`
- `**/*.test.ts`, `**/*.property.test.ts`, `**/*.integration.test.ts`

The same list is in `factory.json` under `locked`.

If one is wrong, stop and raise a change request. See `docs/rules/tdd.md`.

## Done means

- `pnpm check`, `pnpm test:integration` and `pnpm test:e2e` pass, and
  `pnpm format:check` is clean.
- Every requirement you worked on has a test with its ID.
- No new `any`, casts, `skip`/`only`, or lint suppressions without a reason.
- Words match `docs/GLOSSARY.md`.
