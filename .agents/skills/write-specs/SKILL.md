---
name: write-specs
description: Write or change a spec, its contracts and its tests, before any implementation. Use for new features, new modules, bug reports that need a reproducing test, and approved change requests.
---

# Write specs and tests

You own `specs/`, `packages/contracts/` and the tests. You never write the
real implementation. Read `tdd-contracts` first; its rules apply here.

## Inputs

- `AGENTS.md`, `docs/GLOSSARY.md`, `docs/rules/testing.md`
- The request (feature, bug, change request)
- Existing specs and contracts the module touches. Use the spec's header
  and "Where it lives" to see where the module fits, what it depends on and
  what uses it.

## Steps

Work on a `spec/<topic>` branch. Only spec branches may change locked
paths, and their pull requests need a human review.

1. **Spec.** Copy a template from `specs/_templates/`. Keep a module spec
   small: a handful of requirements. Give every requirement an ID. Leave
   `status: draft`. To add to an approved spec, give each new requirement
   the next free ID and end its heading with `[draft]`
   (`specs/README.md`). Rules no fast, reliable test can check go under
   "Safeguards", each with its reason.
2. **Contracts.** Add or change the schemas the interface needs in
   `packages/contracts` (schema first, type from `z.infer`). The seam is
   the contract: never write a test against a shape that is not in an
   approved contract.
3. **Stop for approval.** A human approves the spec and its contracts
   together and sets `status: approved` (or removes `[draft]` from the new
   requirements). Do not write tests before that.
4. **Tests.** For a new feature, start with one E2E happy-path test (the
   tracer bullet). Then write every unit and property test for the module
   spec, each named with its requirement ID.
   A fake that more than one test file needs goes in `src/testing/`
   (`docs/rules/testing.md`), never copied.
5. **Stub.** Add the module with the exact exported names and types from
   the spec, each body `throw new Error("NotImplemented")`. Typecheck and
   lint must pass.
6. **Check RED.** Run `pnpm check:red`. Every new test fails, and only for
   an acceptable reason (`tdd-contracts`, "Acceptable RED"). Contract and
   checks tests are skipped, because they pass by design
   (`docs/rules/tdd.md`, "What RED skips").
7. **Mental mutation check.** For each change below, at least one test must
   fail. If none would, add a test.
   - a wrong constant or argument
   - a wrong branch taken
   - a missing side effect
   - an empty or default return value
   - missing validation for empty, zero, malformed or unauthorised input
8. **Hand off.** Commit specs, contracts, tests and stub together. They are
   now locked. Push and open the spec PR into `main` as a **draft**: its
   `Check` is red until the implementation is merged into it
   (`AGENTS.md`, "Branches").

## Ask, don't guess

If the request is ambiguous, contradictory or missing something, stop.
Write `NEEDS_CLARIFICATION` with the question and the options you see, add
it to the spec's "Open questions", and keep the spec `draft`.

## Excuses

| Excuse                                         | Answer                                                   |
| ---------------------------------------------- | -------------------------------------------------------- |
| "I'll check the code to see what it returns."  | Expected values come from the spec, never from the code. |
| "The spec is vague, I'll pick the likely one." | Stop with `NEEDS_CLARIFICATION`.                         |
| "This is too simple to need a test."           | If it is in the spec, it has a test.                     |
| "One big test covers all of it."               | One requirement per test, so a failure names what broke. |
| "It fails, so RED is done."                    | It must fail for an acceptable reason.                   |
| "I'll mock our repository to keep it simple."  | Replace only at seams we do not own; use a fake adapter. |
