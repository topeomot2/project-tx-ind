---
name: implement
description: Make locked tests pass for an approved spec, one requirement at a time, without changing tests, specs or contracts. Use after write-specs has handed off a module.
---

# Implement

You make the existing tests pass. You do not decide what the code should
do; the spec and tests already did. Read `tdd-contracts` first.

## Inputs, and only these

- The test files, the contracts, the spec
- `AGENTS.md`, `docs/GLOSSARY.md`, `docs/rules/`

Never use the test writer's prompt, reasoning or history. If the tests and
spec are not enough to know what to build, that is a spec problem: raise it.

## Read-only

Specs, contracts and tests are locked (see `AGENTS.md`). Never edit, skip
or weaken them. If a test looks wrong, stop and write a change request:
which requirement, what is wrong, and the change you propose.

## Steps

Work on an `impl/<topic>` branch made from `spec/<topic>`, and open its PR
into `spec/<topic>`, not `main` (`AGENTS.md`, "Branches"). CI fails the
pull request if it changes a locked path (`pnpm check:locks`).

1. Run the tests and confirm they fail with an acceptable RED.
2. Take the lowest requirement ID still failing.
3. Write the **least code** that makes its test pass, but correct for
   **every** valid input the contract allows, not only the values in the
   test. Never special-case test inputs. Match exported names and types
   exactly. Add nothing that no test or safeguard asks for. Build every
   safeguard in the spec's "Safeguards" section that the code touches.
4. Run the **whole** suite: `pnpm check`, plus `pnpm test:e2e` when an app's
   interface changed. Output must be clean: no errors, no warnings.
5. Commit, naming **every** requirement that is now green and was not
   before: `API-2: answer unknown routes with not_found`, or
   `ACC-3, ACC-4: check the password on log in`. One correct change often
   turns several green; do not split or hold back code to keep one per
   commit.
6. Repeat from 2 until every test is green.

Do not refactor along the way; cleanup happens in review.

## Report

List every failing test by name, including failures you did not cause.
Never report done while anything fails. List each safeguard and where the
code builds it, so review can check it by hand.

## Bug fixes

Code written before its failing test exists is deleted, not kept as a
reference. Ask `write-specs` for the reproducing test first.

## Excuses

| Excuse                                         | Answer                                                    |
| ---------------------------------------------- | --------------------------------------------------------- |
| "This test is wrong, I'll just fix it."        | Tests are locked. Write a change request.                 |
| "Returning the expected value makes it pass."  | Code must be right for every valid input, not the test's. |
| "My file passes; the rest isn't mine."         | Run and report the whole suite.                           |
| "While I'm here I'll tidy this up."            | No refactoring in this loop.                              |
| "I'll add this too, it'll be needed."          | Only what a test or a spec safeguard asks for.            |
| "This safeguard has no test, so I'll skip it." | Safeguards are required. Build it and list it.            |
| "Third try failed, one more variation."        | Three tries, then escalate to a human.                    |
