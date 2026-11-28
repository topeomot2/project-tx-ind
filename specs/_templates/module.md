---
id: PREFIX
status: draft
contracts: []
---

# <Module name>

Where it lives: `<path>`

## Purpose

One or two sentences: what this module is responsible for, and what it is not.

## Interface

Everything a caller must know to use this module. Tests use only this.
The invariants below are part of the interface too.

### Exports

| Export | Kind                     | Summary |
| ------ | ------------------------ | ------- |
| `name` | function / schema / type | ...     |

### Error modes

| Situation | Result |
| --------- | ------ |
| ...       | ...    |

### Configuration

- Environment variables, options or ordering rules a caller must know.
  "None." if there are none.

## Examples

Each example is one unit test.

### PREFIX-1: <short name>

- **Input:** ...
- **Expected:** ...

## Invariants

Each invariant is one property test: a rule that holds for every valid input.

<!-- A requirement added after approval ends its heading with [draft]. -->

### PREFIX-2: <short name>

For every <input description>, <rule>.

## Safeguards

Rules no fast, reliable test can check. Each needs a reason. Review checks
them by hand. "None." if there are none.

- <rule>: <why it cannot be tested>

## Open questions

- None.
