# TDD rules

Specs and tests come first; code makes them pass. Two roles, kept apart:

- **Spec and test work** (`.agents/skills/write-specs`) writes specs,
  contracts, tests and a stub. It never writes the real implementation.
- **Implementation work** (`.agents/skills/implement`) makes the tests
  pass. It never changes specs, contracts or tests.

Both follow `.agents/skills/tdd-contracts`, which holds the full rules for
what makes a good test.

## The loop

1. **Small module spec.** A human approves a module spec of a handful of
   requirements, together with its contracts.
2. **Tracer bullet.** A new feature starts with one E2E happy-path test
   from its product spec.
3. **All tests, then lock.** Every test for the module spec is written,
   named with its requirement ID, against a stub that throws
   `NotImplemented`. Each must fail for an acceptable reason: an assertion
   or `NotImplemented`, never a missing module or a type error.
4. **Green in ID order.** Take the lowest failing ID, write the least code
   that is correct for every valid input, and commit. One correct function
   often turns several requirements green at once; that is fine. Each
   commit names every requirement it turns green
   (`ACC-3, ACC-4: check the password on log in`). Never commit with a
   test still red that the commit claims.
5. **Refactor in review,** not in the loop.

## Hard rules

- Expected values come from the spec, never from running the code.
- Implementation adds nothing that no test or **safeguard** asks for. A
  safeguard is a rule in the spec's "Safeguards" section that no fast,
  reliable test can check (equal login timing for real and unknown
  emails, for example). Each has a reason, and review checks it by hand.
- Never weaken a test to make it pass: no loosened assertion, no `skip`,
  `only` or deleted test.
- Locked files (`AGENTS.md`, "Locked paths") change only through a change
  request.
- An unclear spec gets `NEEDS_CLARIFICATION` and an open question. Nobody
  guesses.
- A bug fix starts with a failing test that reproduces it.
- Three failed attempts at the same step: stop and escalate to a human.

## Checked by tools, not trust

| Rule                                       | Enforced by                                          |
| ------------------------------------------ | ---------------------------------------------------- |
| New tests fail for the right reason first  | `pnpm check:red` on `spec/` PRs, at locking commit   |
| Only approved requirements get tests       | `pnpm check:spec-ids` (`[draft]` IDs do not count)   |
| Implementation does not touch locked paths | `pnpm check:locks` + `.github/CODEOWNERS`            |
| No `.only`, `.skip` or `.todo`             | ESLint, in `pnpm check`                              |
| Types are clean                            | `tsc --noEmit`, in `pnpm check`                      |
| Every requirement has a test, and back     | `pnpm check:spec-ids`                                |
| Tests catch real bugs                      | Stryker, nightly (`pnpm test:mutation`), report-only |

All run in `.github/workflows/`.

## What RED skips

`pnpm check:red` judges new unit and property tests only. It skips:

- **Contract tests** (`packages/contracts`): contracts are real schemas,
  approved with the spec, so their tests pass before any implementation.
- **Checks tests** (`packages/checks`): the checks are tooling, changed
  only on spec branches with human approval, and land with their code.
- **Integration and E2E tests:** they need services and running apps.

A property test that throws `NotImplemented` fails with fast-check's
"Property failed" message. The shared Vitest setup in `packages/config`
turns on `includeErrorInReport`, so the message says `Got error:
NotImplemented`. Tests do not need to set it themselves.
