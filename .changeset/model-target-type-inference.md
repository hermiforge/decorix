---
"@hermiforge-decorix/core": minor
"@hermiforge-decorix/react-hook-form": minor
"@hermiforge-decorix/angular-signal": minor
"@hermiforge-decorix/react-tanstack-form": minor
"@hermiforge-decorix/vue-vee-validate": minor
"@hermiforge-decorix/vue-formkit": minor
"@hermiforge-decorix/svelte-felte": minor
"@hermiforge-decorix/solid-felte": minor
"@hermiforge-decorix/solid-modular-forms": minor
"@hermiforge-decorix/nest": minor
"@hermiforge-decorix/angular-reactive": minor
"@hermiforge-decorix/svelte-superforms": minor
"@hermiforge-decorix/zod": minor
---

`ModelTarget<T>` is now generic, and every form/pipe adapter (`toReactHookForm`, `toSignalForm`, `toTanStackForm`, `toVeeValidate`, `toFormKit`, `toFelteForm` (Svelte and Solid), `toModularForm`, `DecorixPipe`, `toReactiveFormConfig`, `createSuperformsValidatorAdapter`) plus `toZod` and core's `validate`/`validateAsync` infer that type directly from a decorated class passed as the model argument — no separate form-values type or `as` cast needed. Purely additive: every generic defaults to `Record<string, unknown>`, so existing calls without a decorated class keep their current behavior unchanged. `json-schema`'s `toJsonSchema` is intentionally not part of this change (its output is a JSON Schema document, not a TypeScript-shaped value). Builder-declared models (`model()`/`stringField()`, ...) still resolve to the default `Record<string, unknown>` — inferring from the builder API is a separate, larger change with no generic building blocks in `field-builders.ts` today.
