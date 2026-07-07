# @hermiforge-decorix/angular-reactive

## 0.4.0

### Minor Changes

- 8c8056c: `ModelTarget<T>` is now generic, and every form/pipe adapter (`toReactHookForm`, `toSignalForm`, `toTanStackForm`, `toVeeValidate`, `toFormKit`, `toFelteForm` (Svelte and Solid), `toModularForm`, `DecorixPipe`, `toReactiveFormConfig`, `createSuperformsValidatorAdapter`) plus `toZod` and core's `validate`/`validateAsync` infer that type directly from a decorated class passed as the model argument — no separate form-values type or `as` cast needed. Purely additive: every generic defaults to `Record<string, unknown>`, so existing calls without a decorated class keep their current behavior unchanged. `json-schema`'s `toJsonSchema` is intentionally not part of this change (its output is a JSON Schema document, not a TypeScript-shaped value). Builder-declared models (`model()`/`stringField()`, ...) still resolve to the default `Record<string, unknown>` — inferring from the builder API is a separate, larger change with no generic building blocks in `field-builders.ts` today.

### Patch Changes

- Updated dependencies [8c8056c]
  - @hermiforge-decorix/core@0.4.0

## 0.3.2

### Patch Changes

- Updated dependencies [3ce2781]
  - @hermiforge-decorix/core@0.3.2

## 0.3.1

### Patch Changes

- @hermiforge-decorix/core@0.3.1

## 0.3.0

### Patch Changes

- Updated dependencies [56f6198]
  - @hermiforge-decorix/core@0.3.0

## 0.2.1

### Patch Changes

- d73f4d4: Fix incorrect "requires a ValidatorAdapter, call `registerZodValidator()` once" guidance in the README of `react-hook-form`, `react-tanstack-form`, `vue-vee-validate`, `vue-formkit`, `nest`, and `zod`. In reality these adapters fall back to Decorix's core validator facade when `options.validator` is omitted, and never consult the global registry set by `registerZodValidator()` — pass `{validator}` explicitly to opt into a different engine. Also fixes a root README example that passed a nonexistent `validator` option to `toSignalForm` (Angular Signal Forms never accepts one).

  Also adds a new `docs/` usage guide (English) with a French mirror in `docs/fr/`, linked from every package README.

- Updated dependencies [d73f4d4]
  - @hermiforge-decorix/core@0.2.1

## 0.2.0

### Patch Changes

- @hermiforge-decorix/core@0.2.0
