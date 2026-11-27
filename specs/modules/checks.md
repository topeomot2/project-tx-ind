---
id: CHK
status: approved
contracts: []
---

# Checks

Where it lives: `packages/checks`

## Purpose

The rules in `docs/rules/tdd.md` that a script can enforce, so CI checks
them instead of trusting agents. The logic is pure functions; small CLIs in
`src/cli/` read git and files and call them.

## Interface

Everything a caller must know to use this module. Tests use only this.

### Exports

| Export              | Kind     | Summary                                                          |
| ------------------- | -------- | ---------------------------------------------------------------- |
| `idsFromSpec`       | function | Status and live requirement IDs of one spec                      |
| `idsFromTestSource` | function | IDs that test names start with in one test file                  |
| `idFromTitle`       | function | The ID a test title starts with                                  |
| `compareIds`        | function | Approved IDs with no test; test IDs with no approved requirement |
| `workKind`          | function | `spec/...` branches are spec work; all others implementation     |
| `lockViolations`    | function | Changed files a kind of work may not touch                       |
| `classifyFailure`   | function | Why a test failed: assertion, NotImplemented, or other           |
| `redProblems`       | function | New requirement tests that do not fail for the right reason      |
| `lockingCommit`     | function | The newest commit that changed a unit or property test           |
| `filesToRestore`    | function | Unlocked files to put back as they were at the locking commit    |
| `redTestFiles`      | function | Test files RED judges, and the ones it skips                     |

CLIs, run from the repo root: `pnpm check:spec-ids`, `pnpm check:locks`,
`pnpm check:red`.

### Error modes

| Situation              | Result                                   |
| ---------------------- | ---------------------------------------- |
| A check finds problems | The CLI lists them and exits with code 1 |

### Configuration

- `BASE_REF`: branch the PR merges into. Default `origin/main`.
- `GITHUB_HEAD_REF`: branch being checked (set by GitHub on pull
  requests). Default: the current git branch.
- Locked paths come from `factory.json` (`locked.hard` + `locked.light`).

## Examples

### CHK-1: Reads status and live IDs from a spec

- **Input:** a spec with `status: approved`, headings `### SHOP-1: ...`,
  `### ~~SHOP-2: ...~~` and `### SHOP-3: ...`, and `SHOP-9` in body text
- **Expected:** status `approved`, IDs `SHOP-1`, `SHOP-3`

### CHK-2: Reads only the IDs that test names start with

- **Input:** `it("SHOP-1: ...")`, `test.only("SHOP-3: ...")`,
  `it.each(...)("SHOP-4: ...")`, a test with no ID, and a plain string
  `"SHOP-5: ..."`
- **Expected:** `SHOP-1`, `SHOP-3`, `SHOP-4`

### CHK-3: Compares approved and tested IDs

- **Input:** approved `A-1`, `A-2`, `B-1`; tested `A-1`, `B-1`, `C-7`
- **Expected:** untested `A-2`; unknown `C-7`

### CHK-4: Only spec/ branches are spec work

- **Input:** `spec/orders`, `impl/orders`, `main`, `feature/spec/x`
- **Expected:** `spec`, `impl`, `impl`, `impl`

### CHK-5: Implementation work may not touch locked paths

- **Input:** impl work changing a source file, a test, a spec and a contract
- **Expected:** the test, the spec and the contract are violations

### CHK-6: Spec work may touch locked paths

- **Input:** spec work changing a spec
- **Expected:** no violations

### CHK-7: Classifies failures

- **Input:** an `AssertionError`, an `Error: NotImplemented`, a missing
  module, a `TypeError`
- **Expected:** `assertion`, `not-implemented`, `other`, `other`

### CHK-8: New tests that fail for the right reason pass the RED check

- **Input:** new IDs `ORD-1`, `ORD-2`, failing with an assertion and with
  NotImplemented
- **Expected:** no problems

### CHK-9: New tests that pass, fail wrongly or never ran are reported

- **Input:** new `ORD-1` passes, new `ORD-2` fails on a missing module,
  new `ORD-3` has no result
- **Expected:** one problem for each, in that order

### CHK-10: Tests for requirements that are not new are ignored

- **Input:** new IDs `ORD-2`; `ORD-1` passes, `ORD-2` fails with an
  assertion
- **Expected:** no problems

### CHK-11: Finds the locking commit

- **Input:** commits newest first: `c4` changes a source file, `c3` an
  integration test, `c2` a property test, `c1` a unit test; and a second
  case where no commit changes a test
- **Expected:** `c2`; then no locking commit
- **Why:** `pnpm check:red` judges the branch as it was at the locking
  commit, so a spec branch that implementation was merged into (a stacked
  branch) stays checkable.

### CHK-12: Puts unlocked files back as they were at the locking commit

- **Input:** changes since the locking commit: a source file modified, one
  added, one deleted, a test modified and a module spec modified; locked
  `**/*.test.ts`, `specs/modules/**`
- **Expected:** restore the modified and the deleted source files; remove
  the added one; leave the test and the spec alone
- **Why:** the CLI writes these files for the run and always puts HEAD's
  versions back afterwards.

### CHK-13: Contract and checks tests are not judged by RED

- **Input:** changed files: a contract test, a checks test, a unit test, a
  property test, an integration test and a source file
- **Expected:** judged: the unit and property tests; skipped: the contract
  test and the checks test
- **Why:** contracts are real schemas approved with the spec, so their
  tests pass before any implementation. The checks are tooling, changed
  only on spec branches with human approval, and land with their
  implementation. The CLI prints how many test IDs it skipped.

## Invariants

- None yet.

## Open questions

- None.
