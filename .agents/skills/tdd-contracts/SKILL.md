---
name: tdd-contracts
description: Shared rules for writing and judging tests in this repo. Read before writing tests (write-specs) or making tests pass (implement), and when reviewing whether a test is good.
---

# TDD with contracts

Tests are written from specs, against contracts, before the code. One
agent writes specs and tests (`write-specs`); another makes them pass
(`implement`). This file holds the rules both share.

Words follow `docs/GLOSSARY.md` and the `codebase-design` skill: module,
interface, seam, adapter.

## The flow

1. A human approves a **small module spec** (a handful of requirement IDs)
   together with its contracts in `packages/contracts`.
2. **Tracer bullet:** a new feature starts with one E2E happy-path test
   from its product spec, so one thin path works end to end first.
3. `write-specs` writes and locks **all** tests for that module spec, plus a
   stub that throws `NotImplemented`.
4. `implement` makes them pass **one requirement at a time**, in ID order,
   committing after each one goes green.
5. Refactoring happens in review, not in this loop.

## What makes a good test

1. **Behaviour through the interface.** Call what a caller calls; assert
   what a caller sees. A good test survives any refactor that keeps the
   behaviour.
2. **No tautologies.** Expected values come from an independent source: a
   literal, a worked example, the spec. Never compute them the way the code
   does. A property states a fact about the output (an invariant, a round
   trip, a comparison with a simple oracle), never a second copy of the
   implementation.
3. **Not coupled to the implementation.** No private functions, no
   asserting call order or call counts on our own collaborators, no
   checking through a side channel (querying the database instead of
   asking the interface).
4. **Name the break.** Before writing a test, say which bug in production
   code would make it fail. Cannot name one: redesign the test around
   observable behaviour. Only a deliberate design decision would make it
   fail: it is a change detector, so test the behaviour that depends on the
   decision instead.
5. **Behaviour, not text; our code, not the framework.** Do not assert
   source text, log wording or what Hono, Zod or Node already guarantee.
6. **Replace only at seams we do not own:** external services, time,
   randomness, and sometimes the database or file system. Never mock our
   own modules. Take dependencies as parameters, one function per external
   operation.
7. **Fake discipline.** A fake is never the thing under test. Build fakes
   from the contract schemas so they have the full real shape. Test-only
   helpers live in test files, never in production code. Learn what a
   dependency really does before faking it.
8. **A bug fix starts with a failing test** that reproduces the bug.
9. **Names:** requirement ID, then domain words from the spec:
   `it("API-2: answers an unknown route with a not_found error")`.

## Acceptable RED

A new test must fail before the code exists, and for the right reason:

- **Acceptable:** an assertion failure, or `Error("NotImplemented")` from
  the stub.
- **Not acceptable:** module not found, a syntax or type error, a
  `TypeError` inside the test itself, a timeout. Fix the test or the stub
  first.

## Escalation

- **3 failed attempts at the same step: stop.** Report to a human what you
  tried and the exact failure. Do not try a fourth variation.
- **Spec unclear:** stop with `NEEDS_CLARIFICATION` (see `write-specs`).
  A wrong test is worse than no test.

## Credits

Adapted from Matt Pocock's `tdd` (mattpocock/skills), Jesse Vincent's
`test-driven-development` (obra/superpowers) and NarAI Labs' `agentic-tdd`
(narailabs/claude-agentic-tdd), all MIT. See `LICENSES/`.
