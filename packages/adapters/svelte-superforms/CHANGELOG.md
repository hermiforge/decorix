# @hermiforge-decorix/svelte-superforms

## 0.4.0

### Minor Changes

- 8c8056c: `ModelTarget<T>` is now generic, and every form/pipe adapter (`toReactHookForm`, `toSignalForm`, `toTanStackForm`, `toVeeValidate`, `toFormKit`, `toFelteForm` (Svelte and Solid), `toModularForm`, `DecorixPipe`, `toReactiveFormConfig`, `createSuperformsValidatorAdapter`) plus `toZod` and core's `validate`/`validateAsync` infer that type directly from a decorated class passed as the model argument — no separate form-values type or `as` cast needed. Purely additive: every generic defaults to `Record<string, unknown>`, so existing calls without a decorated class keep their current behavior unchanged. `json-schema`'s `toJsonSchema` is intentionally not part of this change (its output is a JSON Schema document, not a TypeScript-shaped value). Builder-declared models (`model()`/`stringField()`, ...) still resolve to the default `Record<string, unknown>` — inferring from the builder API is a separate, larger change with no generic building blocks in `field-builders.ts` today.

### Patch Changes

- Updated dependencies [8c8056c]
  - @hermiforge-decorix/core@0.4.0
  - @hermiforge-decorix/json-schema@0.4.0

## 0.3.2

### Patch Changes

- Updated dependencies [3ce2781]
  - @hermiforge-decorix/core@0.3.2
  - @hermiforge-decorix/json-schema@0.3.2

## 0.3.1

### Patch Changes

- @hermiforge-decorix/json-schema@0.3.1
- @hermiforge-decorix/core@0.3.1

## 0.3.0

### Minor Changes

- 4cb03eb: Add 4 new framework adapters, closing the "Svelte and SolidJS adapters" TODO with double coverage matching React/Vue: `svelte-felte` and `solid-felte` (Felte, config-shaped like FormKit/React Hook Form), `solid-modular-forms` (Modular Forms, whole-form `validate` option), and `svelte-superforms` (Superforms/`sveltekit-superforms`, implementing its own `ValidationAdapter` contract — SvelteKit-only, unlike the other three). `solid-forms` was replaced by Felte in the SolidJS lineup after finding it had almost no reliable documentation to verify against.

### Patch Changes

- Updated dependencies [56f6198]
  - @hermiforge-decorix/core@0.3.0
  - @hermiforge-decorix/json-schema@0.3.0
