# Specs

Specs say what the system must do, before any test or code exists.
Tests are written from specs, never from the implementation.

## Two levels

| Level   | Folder     | Describes                                 | Drives                                                       | Lock  |
| ------- | ---------- | ----------------------------------------- | ------------------------------------------------------------ | ----- |
| Product | `product/` | Behaviour a user or caller can observe    | E2E tests in `tests/e2e`                                     | Hard  |
| Module  | `modules/` | One module's public surface and its rules | Unit (`*.test.ts`) and property tests (`*.property.test.ts`) | Light |

- **Hard lock:** changes only with human approval.
- **Light lock:** may change when the design is refactored; the change is
  proposed and a reviewer approves it.

Start a new spec by copying a file from `_templates/`.

## Header

Every spec starts with a front-matter block:

```yaml
---
id: HEALTH # prefix for every requirement ID in this file
status: draft # draft | approved
contracts: [Health] # schemas from @repo/contracts this spec relies on
---
```

Tests are written only from an `approved` spec.

## Requirement IDs

Each requirement has a stable ID: `<PREFIX>-<n>`, e.g. `HEALTH-1`.

- The test that checks it starts its name with the ID:
  `test("HEALTH-1: the api reports healthy", ...)`.
- IDs are never reused or renumbered. A removed requirement keeps its ID,
  struck through, so old references stay meaningful.

## Writing requirements

- **Product:** Given / When / Then, in the caller's words. Only what can be
  seen from outside (HTTP, UI), never how it is built.
- **Module:** examples (one input, one expected output) and invariants
  (rules that hold for every valid input). Invariants become property tests.
- Expected values come from the spec, not from running the code.

## Open questions

If a requirement is ambiguous, do not guess. Add it under
"Open questions" in the spec and leave the status at `draft` until a human
answers it.
