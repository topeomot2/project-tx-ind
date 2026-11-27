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
pnpm check:spec-ids     # every approved requirement has a test, and back
pnpm check:locks        # this branch only changes what its kind of work may
pnpm check:red          # on spec/ branches: new tests fail for the right reason
pnpm test:mutation      # Stryker mutation testing (slow; nightly in CI)
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

## Branches

- `spec/<topic>`: spec and test work (specs, contracts, tests, stubs).
- `impl/<topic>`: implementation work. Any other branch name counts as
  implementation work.
- Stacked: a PR from `impl/<topic>` targets `spec/<topic>`. Once green,
  `spec/<topic>` merges to `main` in one PR.

## Locked paths

Implementation work reads these but never edits them. The full list is
`locked` in `factory.json`; in short:

- specs, contracts and every test file
- the rules: `AGENTS.md`, `docs/`, `.agents/`
- the checks and their settings: `.github/`, `packages/checks/`,
  `packages/config/`, root `package.json`, `pnpm-workspace.yaml`,
  `turbo.json`, and every `tsconfig.json`, `eslint.config.js`,
  `vitest*.config.ts`, `stryker.config.js`, `playwright.config.ts`

CI enforces this on every pull request (`pnpm check:locks`), and
`.github/CODEOWNERS` makes a human review these paths. If one is wrong,
stop and raise a change request. See `docs/rules/tdd.md`.

## Done means

- `pnpm check`, `pnpm test:integration`, `pnpm test:e2e` and
  `pnpm check:spec-ids` pass, and `pnpm format:check` is clean.
- Every requirement you worked on has a test with its ID.
- No new `any`, casts, `skip`/`only`, or lint suppressions without a reason.
- Words match `docs/GLOSSARY.md`.
