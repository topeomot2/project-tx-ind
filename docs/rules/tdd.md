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
4. **Green, one requirement at a time,** in ID order, with a commit after
   each. Minimal code, correct for every valid input, not just the test's.
5. **Refactor in review,** not in the loop.

## Hard rules

- Expected values come from the spec, never from running the code.
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
| Implementation does not touch locked paths | `pnpm check:locks` + `.github/CODEOWNERS`            |
| No `.only`, `.skip` or `.todo`             | ESLint, in `pnpm check`                              |
| Types are clean                            | `tsc --noEmit`, in `pnpm check`                      |
| Every requirement has a test, and back     | `pnpm check:spec-ids`                                |
| Tests catch real bugs                      | Stryker, nightly (`pnpm test:mutation`), report-only |

All run in `.github/workflows/`.
