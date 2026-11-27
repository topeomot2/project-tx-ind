# TypeScript rules

The compiler and linter are the first, fastest check. Write code they can
check fully.

## Settings you can rely on

The shared config (`packages/config/tsconfig/base.json`) is strict, plus:

- `noUncheckedIndexedAccess`: `arr[i]` and `record[key]` may be `undefined`.
  Handle it.
- `exactOptionalPropertyTypes`: an optional property may be missing, but is
  not `undefined` unless the type says so.
- `noPropertyAccessFromIndexSignature`: index signatures use `obj["key"]`,
  e.g. `process.env["PORT"]`.
- `erasableSyntaxOnly`: Node runs `.ts` files by stripping types, so no
  `enum`, `namespace` or constructor parameter properties.
- `verbatimModuleSyntax`: type-only imports use `import type`.

ESLint uses typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`.
Prettier owns formatting; never format by hand.

## Rules

1. **No `any`.** Use `unknown` and narrow it.
2. **No `as` casts or `!` non-null assertions** to silence an error. Narrow
   with a check, or parse with a contract schema.
3. **Parse at the edge.** Data from outside (HTTP bodies, env, files, queue
   messages) is `unknown` until a schema from `@repo/contracts` parses it.
4. **The schema is the source of truth.** Derive types with `z.infer`; never
   write a type by hand next to its schema.
5. **Instead of `enum`**, use a union of string literals or a `z.enum`.
6. **Use `satisfies`** to check a value against a contract without widening
   it: `c.json({ ... } satisfies Health)`.
7. **Imports:** ESM only, relative imports end in `.ts`, and another package
   is imported only through its entry point (`@repo/contracts`), never a
   file inside it.
8. **No suppressions without a reason.** If a rule really must be turned
   off for one line, use
   `// eslint-disable-next-line <rule> -- <why>` or
   `// @ts-expect-error <why>`. Never `@ts-ignore`, never a file-wide
   disable.
9. **Errors:** throw `Error` objects, catch `unknown`. Errors that leave an
   app use the `ApiError` contract.

## JavaScript apps

A JS app extends `@repo/config/tsconfig/js.json` (`checkJs`) and writes
types in JSDoc. The same rules apply: `@type`, `@param` and `@returns`
replace annotations, and `/** @import { Health } from "@repo/contracts" */`
replaces `import type`.
