# Decorix Examples

Runnable, typechecked usage examples for every published package.

## Layout

- `basic/index.ts` — the shortest possible quickstart (builder model + Zod).
- `core/`, `zod/`, `json-schema/`, `nest/`, `react-hook-form/`, `react-tanstack-form/`,
  `angular-reactive/`, `angular-signal/`, `vue-formkit/`, `vue-vee-validate/` —
  one `class-model.ts` (decorator API) and one `builder-model.ts` (builder API)
  per package, each declaring the same multi-field `RegisterUserDto` (name,
  email, age, password/confirmPassword with a cross-field `EqualsField`
  constraint) and validating both a valid and an invalid payload, printing the
  real validation errors the adapter produces.
- `advanced/` — cross-cutting features not tied to one specific framework
  adapter: async validation, custom constraints (decorator and builder, sync
  and async), cross-field and object-level constraints, nested objects/arrays,
  validation groups, and the `@decorix/cli` programmatic API.

## Running

Typecheck every example (no execution, matches CI):

```sh
pnpm examples:typecheck
```

Actually run every example and see the printed output (validation results,
error messages, generated schemas):

```sh
pnpm examples:run
```

`examples:run` executes each `.ts` file directly with `tsx`, which resolves
the `@decorix/*` package aliases through `tsconfig.base.json`'s `paths` —
no build step required, and no `examples/package.json`/workspace membership
needed (this directory is intentionally not a pnpm workspace package, just a
collection of scripts).
