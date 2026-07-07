# Troubleshooting

## `Cannot read properties of undefined (reading 'constructor')`

Decorix decorators are **legacy** TypeScript decorators, not the standard
TC39 decorators. Your file must be transpiled with
`"experimentalDecorators": true` in the applicable `tsconfig.json`.

- In a regular project, enable this flag in your `tsconfig.json`.
- With the `decorix` CLI, this message means the automatically resolved
  `tsconfig.json` (the nearest one above the entry file, otherwise the CWD)
  doesn't enable the flag — pass one explicitly with `--tsconfig <file>`. See
  [`decorix` CLI](./cli.md#requirements-for-decorator-dtos).

## `validate()` rejects my model with an error about async constraints

`validate` is **synchronous** and deliberately rejects any model containing a
constraint defined with `defineAsyncConstraint`/`createAsyncConstraint`,
rather than returning a silently incomplete result. Use `validateAsync`
instead, or detect the generic case with `hasAsyncConstraints(metadata)` +
`runSchemaAsync(...)` — see
[Validation Guide § Async validation](./validation-guide.md#async-validation).

## The CLI can't find my model (`scan` returns an empty list)

- The model must be **exported** (`export class UserDto` or
  `export const UserDto = model(...)`) — a non-exported model is invisible to
  the CLI.
- If the file exports several models, pass `--model <name>` to disambiguate
  (model name or export name).

## Peer dependency warning (React/Angular/Vue)

Adapters declare their peer dependencies as caret ranges on the same
major/minor baseline that's actually tested (e.g. `"react": "^19.2.0"`). A
warning for a version below that baseline, or a different major, signals a
real potential incompatibility — check the tested version in the adapter's
own `package.json`.

## A value isn't being transformed/cleaned up as expected

Decorix performs **no** coercion or transformation (no trimming, no
string→number conversion, no date parsing) — see
[Core Concepts § Positioning](./core-concepts.md#positioning-validation-not-transformation).
If your case needs a transformation, do it before the value reaches Decorix
(in your form library, or a dedicated mapper).

## `fromJsonSchema` / importing an external schema

Only import schemas you trust: an imported `pattern` becomes a `RegExp` that
is actually executed on every validation, which exposes you to a ReDoS risk
if the schema comes from an untrusted source. See
[JSON Schema § Security](./json-schema.md#security-only-import-schemas-you-trust).

## Anything else?

Check the README of the relevant package (`packages/core/README.md`,
`packages/adapters/*/README.md`, `packages/cli/README.md`) — each documents
its own known limitations. For a reproducible bug, open a GitHub issue; for a
vulnerability, follow [`SECURITY.md`](../SECURITY.md) instead of a public
issue.
