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
apps/*/src/testing/  shared test fakes, e.g. in-memory adapters (locked, light)
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
   its contracts. A new requirement in an approved spec stays `[draft]`
   until approved on its own (`specs/README.md`).
2. **Tests** are written from the spec, each named with a requirement ID,
   and locked. Skill: `write-specs`.
3. **Implementation** makes them pass, in requirement ID order. Each
   commit names the requirements it turns green. Skill: `implement`.
4. **Review** checks the work and does any refactoring.

Both sides follow `tdd-contracts`. For module and interface design, use
`codebase-design`. The short version is `docs/rules/tdd.md`.

## Branches

- `spec/<topic>`: spec and test work (specs, contracts, tests, stubs).
- `impl/<topic>`: implementation work. Any other branch name counts as
  implementation work.

Every feature reaches `main` as a stack of two PRs:

1. **Spec PR**, `spec/<topic>` into `main`, opened as a **draft**. Its new
   tests fail on purpose, so `Check` stays red here; `Locks` must be green,
   because it runs `pnpm check:red`.
2. **Impl PR**, `impl/<topic>` (branched from `spec/<topic>`) into
   `spec/<topic>`. All four checks must be green. Merge it into
   `spec/<topic>`.
3. The spec PR now holds specs, tests and code, and goes green. Mark it
   ready and merge it into `main`. RED is still judged at the locking
   commit, so the merged implementation does not break it.

Changes to the rules and checks alone (no new feature tests) are one
`spec/<topic>` PR into `main`.

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

## Approval

The owner's approval of a spec, its contracts and each PR is the real
gate; agents never approve their own work. PRs that agents open can show
the owner as author, and GitHub does not let an author approve their own
PR. So the `main` ruleset lets repository admins bypass the review, and
the owner merges as admin after approving in writing (in the PR or the
task thread). Required checks still apply.

## Done means

- `pnpm check`, `pnpm test:integration`, `pnpm test:e2e` and
  `pnpm check:spec-ids` pass, and `pnpm format:check` is clean.
- Every requirement you worked on has a test with its ID.
- No new `any`, casts, `skip`/`only`, or lint suppressions without a reason.
- Words match `docs/GLOSSARY.md`.
