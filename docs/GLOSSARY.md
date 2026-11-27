# Glossary

One term, one meaning. Use these words exactly, in code, specs, docs and
commit messages. If a word is under **Avoid**, use the term it belongs to
instead.

Each entry says what the term **is**, what it is **not**, and where it
**lives** in this repo.

## Design terms

From Matt Pocock's `codebase-design` skill (MIT).

### Module

- **Is:** anything with an interface and an implementation: a function, a
  file, a package or an app. Deliberately size-agnostic.
- **Not:** a synonym for "file". One file can hold several modules.
- **Lives:** everywhere. Specced modules have a file in `specs/modules/`.
- **Avoid:** unit, component, service.

### Interface

- **Is:** everything a caller must know to use a module correctly: types,
  invariants, error modes, ordering rules, configuration.
- **Not:** only the type signature, and not the TypeScript `interface`
  keyword.
- **Lives:** written down in the module's spec; its shared types are in
  `packages/contracts`.
- **Avoid:** API, signature, public surface.

### Implementation

- **Is:** the code inside a module, behind its interface.
- **Not:** something tests reach into.
- **Lives:** `src/` of each app and package.
- **Avoid:** internals (as a noun for the whole body), guts.

### Depth

- **Is:** how much behaviour a caller gets per piece of interface they must
  learn. A module is **deep** when a small interface hides a lot of
  behaviour, **shallow** when the interface is nearly as big as the
  implementation.
- **Not:** lines of code.
- **Avoid:** complexity (it is the opposite goal).

### Seam

- **Is:** a place where behaviour can change without editing that place;
  where a module's interface sits. Modules may also have internal seams,
  used only by their own tests.
- **Not:** a network or deployment line.
- **Avoid:** boundary, layer.

### Adapter

- **Is:** a concrete thing that fills an interface at a seam, e.g. a
  Postgres repository or an in-memory fake.
- **Not:** a seam. One adapter is a hypothetical seam; two make it real.
- **Avoid:** driver, plugin, wrapper.

### Leverage

- **Is:** what callers gain from depth: more capability per thing learned.

### Locality

- **Is:** what maintainers gain from depth: a change, bug or fix lives in
  one place instead of across callers.

## Project terms

### App

- **Is:** a program that runs on its own: a backend, frontend or worker.
- **Not:** a service; a package.
- **Lives:** `apps/<name>/`.
- **Avoid:** project, service, microservice.

### `api`

- **Is:** the name of the HTTP app in `apps/api`.
- **Not:** a design term. For what a caller must know, say **interface**.

### Package

- **Is:** shared code used by apps, published inside the workspace as
  `@repo/<name>`.
- **Not:** an app; it never runs on its own.
- **Lives:** `packages/<name>/`.
- **Avoid:** lib, shared, common, utils.

### Service

- **Is:** a backing process the apps need, run by Docker Compose: a
  database, a queue, a cache.
- **Not:** an app or a module.
- **Lives:** `compose.yaml`; started for tests by `@repo/services`.
- **Avoid:** infra, dependency.

### Manifest

- **Is:** `factory.json`: the machine-readable list of apps (kind, language,
  services) and locked paths. Tools and agents read it instead of guessing.
- **Not:** configuration an app reads at runtime.
- **Lives:** `factory.json` at the root.

### Contract

- **Is:** a Zod schema plus the type derived from it with `z.infer`; the
  shared, type-level part of an interface.
- **Not:** the whole interface (invariants and error modes are in the spec);
  not a place for logic.
- **Lives:** `packages/contracts/src/`.
- **Avoid:** DTO, model, payload type.

### Spec

- **Is:** a Markdown file that says what must be true before tests or code
  exist. Either a **product spec** or a **module spec**.
- **Not:** documentation of existing code; a task list.
- **Lives:** `specs/`.
- **Avoid:** PRD, story, ticket, design doc.

### Product spec

- **Is:** behaviour a caller can observe from outside (HTTP, UI), written as
  Given / When / Then. Drives E2E tests. Hard lock.
- **Lives:** `specs/product/`.

### Module spec

- **Is:** one module's interface, examples and invariants. Drives unit and
  property tests. Light lock.
- **Lives:** `specs/modules/`.

### Requirement

- **Is:** one numbered item in a spec, with a requirement ID such as
  `HEALTH-1`. Every requirement has at least one test whose name starts
  with its ID.
- **Avoid:** acceptance criterion, AC, case, rule.

### Example

- **Is:** a requirement with one input and one expected output. Becomes a
  unit test.

### Invariant

- **Is:** a requirement that holds for every valid input. Becomes a
  property test.
- **Not:** the test itself (that is a property test).
- **Avoid:** property (on its own), law.

### Unit test

- **Is:** a Vitest test of one module through its interface, with one
  example.
- **Lives:** `src/**/*.test.ts`, next to the code.

### Property test

- **Is:** a Vitest + fast-check test that checks an invariant against many
  generated inputs.
- **Lives:** `src/**/*.property.test.ts`, next to the code.

### Integration test

- **Is:** a Vitest test of one module through its interface, against a real
  service (e.g. Postgres) in a throwaway container. Needs Docker.
- **Not:** an E2E test; it does not start apps or go through HTTP.
- **Lives:** `src/**/*.integration.test.ts`, next to the code. Runs with
  `pnpm test:integration`.

### E2E test

- **Is:** a Playwright test that checks a product spec requirement against
  running apps, through their interface only.
- **Lives:** `tests/e2e/src/**/*.spec.ts`.
- **Avoid:** acceptance test, UI test, system test.

### Locked

- **Is:** a file that implementation work may read but not change: specs,
  contracts and tests. **Hard lock**: changes need human approval. **Light
  lock**: a reviewer approves a proposed change.
- **Avoid:** frozen, read-only, protected.

### Mutation testing

- **Is:** checking that tests catch bugs by planting small bugs
  (**mutants**) in the code and seeing whether any test fails. A mutant no
  test catches has **survived**. The **mutation score** is the share
  caught. Tool: Stryker.
- **Not:** coverage, which only says a line ran.
- **Lives:** `stryker.config.js` per package; `pnpm test:mutation`.

### Change request

- **Is:** how implementation work asks for a change to a locked file: it
  stops, explains the problem and proposes the change, instead of editing.
- **Avoid:** workaround, override.

### Error code

- **Is:** the stable `code` field of an `ApiError`, e.g. `not_found`.
  Callers branch on it; it is never reworded.
- **Not:** the `message`, which is for humans and may change.
