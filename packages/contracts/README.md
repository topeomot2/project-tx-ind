# @repo/contracts

The shared, public shapes that apps agree on: data types, error types and
the Zod schemas that validate them at runtime.

## Rules

- **The schema is the source of truth.** Write the Zod schema, then derive
  the type with `z.infer`. Never write a type by hand next to its schema.
- **Locked.** Only the spec/test side changes this package. Implementation
  work reads it but does not edit it; a needed change is raised as a request.
- **Shapes only.** No business logic, no I/O. Small pure helpers that belong
  to a shape (e.g. a refinement) are fine.
- **One public entry.** Everything is exported from `src/index.ts`.
- **No build step.** `exports` points at the TypeScript source. Bundlers,
  Vitest and Node (type stripping) all read it directly, so code must stay
  erasable: no `enum`, no `namespace`, no parameter properties.
