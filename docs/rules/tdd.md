# TDD rules

Work in small vertical slices: one requirement, one failing test, the
least code that passes it, then tidy up.

## Who writes what

- **Spec and test work** writes specs, contracts and tests, from the spec
  only, never from existing code.
- **Implementation work** writes code in `src/` (not tests) until the tests
  pass. It reads specs, contracts and tests but does not change them.

## The loop

1. **Pick one requirement** from an `approved` spec.
2. **Red.** Write one test for it, named with its ID. Run it and **watch it
   fail**, for the reason you expect (an assertion, not a typo or an import
   error). A test you have not seen fail proves nothing.
3. **Green.** Write the least code that makes it pass. Do not add behaviour
   no test asks for.
4. **Refactor.** Improve names and structure while every test stays green.
   Change the implementation, not the interface.
5. Run `pnpm check`. Repeat from 1.

## Hard rules

- **Expected values come from the spec**, never from running the code and
  copying the output.
- **Never weaken a test to make it pass:** no loosening an assertion, no
  `skip`, `only`, `todo` or deleted test, no catching the error the test
  expects.
- **Never edit a locked file** (specs, contracts, tests) during
  implementation work. If one looks wrong, stop and raise a change request:
  what is wrong, which requirement, and the change you propose.
- **Ambiguous spec? Do not guess.** Add the question to the spec's "Open
  questions", leave it `draft`, and stop. A human answers.
- **"It's too simple to test" is not a reason.** Neither is "I'll add the
  test after". If it is worth writing, it has a requirement and a test.
