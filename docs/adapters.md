# Form Adapters

A Decorix model depends on no framework; each *adapter* translates its
metadata toward a specific library's target shape. Install only the
package(s) matching your stack — the former aggregate packages
`@hermiforge-decorix/angular`, `@hermiforge-decorix/react`, and
`@hermiforge-decorix/vue` are deliberately absent, to keep peer dependencies
narrow.

## Decision table

| Framework | Package | Main function | Uses a `ValidatorAdapter`? |
| --- | --- | --- | --- |
| Angular Signal Forms | `@hermiforge-decorix/angular-signal` | `toSignalForm` | Never — maps straight onto Angular's native validators |
| Angular Reactive Forms | `@hermiforge-decorix/angular-reactive` | `toReactiveFormConfig` | Only auto-built (core facade) when cross-field/async metadata is present |
| React Hook Form | `@hermiforge-decorix/react-hook-form` | `toReactHookForm`, `useReactHookDecorix` | Core facade by default; pass `{validator}` for another engine |
| React TanStack Form | `@hermiforge-decorix/react-tanstack-form` | `toTanStackForm`, `useTanStackDecorix` | Core facade by default; pass `{validator}` for another engine |
| Vue VeeValidate | `@hermiforge-decorix/vue-vee-validate` | `toVeeValidate`, `useVeeDecorix` | Core facade by default; pass `{validator}` for another engine |
| Vue FormKit | `@hermiforge-decorix/vue-formkit` | `toFormKit`, `useFormKitDecorix` | Core facade by default; pass `{validator}` for another engine |
| Nest (validation pipe) | `@hermiforge-decorix/nest` | `DecorixPipe` | Core facade by default; pass `{validator}` for another engine |
| Zod | `@hermiforge-decorix/zod` | `toZod`, `registerZodValidator` | — (it is itself a `ValidatorAdapter`) |
| JSON Schema | `@hermiforge-decorix/json-schema` | `toJsonSchema`, `fromJsonSchema` | No |

None of these adapters require installing `@hermiforge-decorix/zod` to work —
the core facade already implements native/custom/cross-field/async validation
on its own. Pass `{validator: createZodValidatorAdapter()}` explicitly only if
you want Zod (or another engine) instead of the core facade — see
[Core Concepts](./core-concepts.md#validatoradapter-the-neutral-optional-contract).

## Known limitations per adapter

- **Angular Reactive Forms**: cross-field/object constraints can't be
  expressed by a single control's `ValidatorFn`; the adapter exposes a
  form-level `validate`, backed by the core, when this kind of metadata is
  present.
- **Vue VeeValidate**: cross-field constraints are checked at the field level
  against the last known snapshot of sibling fields (via `initialValues`) —
  an exact whole-object check requires explicitly calling
  `config.validate()`/`validateAsync()` on submit.
- **Vue FormKit**: only constraints with a native FormKit equivalent
  (`length`, `matches`, `email`, `url`, `min`, `max`, ...) appear in the
  inline validation string; the others (`slug`, `integer`, `past`/`future`,
  `equalsField`, custom constraints) remain enforced only through
  `config.validate()`/`validateAsync()`.
- **Angular Signal Forms**: `form()` must run inside a real Angular injection
  context — the examples export a factory rather than calling `toSignalForm`
  at module scope.

Each limitation is documented in detail (and tested) in the relevant
package's README — check it before implementing a case not covered here.

## Where to read next

- Installation, full API, and examples: `packages/adapters/<name>/README.md`.
- Runnable examples per framework: `examples/<name>/class-model.ts` and `examples/<name>/builder-model.ts` (`pnpm examples:run`).
- Generate an adapter's configuration without hand-writing integration code: [`decorix` CLI](./cli.md).
