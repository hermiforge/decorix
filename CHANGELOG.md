# Decorix

Aggregated release notes across every `@hermiforge-decorix/*` package (versioned
together as a single `fixed` group — see `.changeset/config.json`). Each
package also keeps its own `CHANGELOG.md` with the same entries scoped to
just that package; this file exists so the whole release doesn't require
digging through 15 separate files. Generated automatically from
`.changeset/*.md` by `scripts/aggregate-root-changelog.mjs` as part of every
`pnpm version` run (manual or CI) — see `ROADMAP.md` for the full narrative
development history behind each entry.

## 0.3.1

### Patch Changes

- Fix `loadEntry` crashing with `Cannot read properties of undefined (reading 'constructor')` on Angular CLI/Nx-style workspaces, where the root `tsconfig.json` uses `"files": []` plus `"references"` to `tsconfig.app.json`/`tsconfig.spec.json`. tsx only applies a tsconfig's `experimentalDecorators` to a file when that tsconfig's `files`/`include` actually covers it; a solution-style root config covers nothing, so tsx silently fell back to TC39 standard decorators and crashed legacy-decorator registration. `loadEntry` now uses `get-tsconfig` to follow `references` and find the config that actually covers the entry file (e.g. `tsconfig.app.json`) before handing it to tsx.

## 0.3.0

### Minor Changes

- Add locale/i18n support for native constraint messages: `LocaleRegistry`, `registerLocale`, `getLocaleMessage`, and a new `ValidationOptions.localeRegistry`. When `context.locale` matches a registered translation, `messageForConstraint`/`normalizeConstraintIssue` use it instead of the English default; missing locales/translations and explicit user message overrides behave exactly as before. Decorix ships the registration mechanism only, no bundled translation dictionary.
- Add 4 new framework adapters, closing the "Svelte and SolidJS adapters" TODO with double coverage matching React/Vue: `svelte-felte` and `solid-felte` (Felte, config-shaped like FormKit/React Hook Form), `solid-modular-forms` (Modular Forms, whole-form `validate` option), and `svelte-superforms` (Superforms/`sveltekit-superforms`, implementing its own `ValidationAdapter` contract — SvelteKit-only, unlike the other three). `solid-forms` was replaced by Felte in the SolidJS lineup after finding it had almost no reliable documentation to verify against.

### Patch Changes

- Fix `loadEntry` failing to resolve prebuilt package imports (observed with `@angular/core`'s `fesm2022` bundle under pnpm) with `Cannot find module '...core.mjs?namespace=...'`. The loader now registers tsx globally via `register()` instead of the scoped `tsImport()` API, which was unconditionally tagging every resolved module URL with an isolation query string that broke resolution of some prebuilt ESM exports.

## 0.2.1

### Patch Changes

- Fix incorrect "requires a ValidatorAdapter, call `registerZodValidator()` once" guidance in the README of `react-hook-form`, `react-tanstack-form`, `vue-vee-validate`, `vue-formkit`, `nest`, and `zod`. In reality these adapters fall back to Decorix's core validator facade when `options.validator` is omitted, and never consult the global registry set by `registerZodValidator()` — pass `{validator}` explicitly to opt into a different engine. Also fixes a root README example that passed a nonexistent `validator` option to `toSignalForm` (Angular Signal Forms never accepts one).

  Also adds a new `docs/` usage guide (English) with a French mirror in `docs/fr/`, linked from every package README.

## 0.2.0

### Minor Changes

- Add CLI commands for the 6 previously uncovered adapters: `angular-signal`, `react-hook-form`, `react-tanstack-form`, `vue-formkit`, `vue-vee-validate`, and `nest`. All 9 `@hermiforge-decorix/*` adapters now have a dedicated `decorix` command.

### Patch Changes

- Fix 4 adapters published in `0.1.0` that produced output not recognized by their target library's real runtime API:

  - `angular-signal`: now builds a real Angular Signal Forms `FieldTree` via the actual `form()`/`schema` API (native validators + `validate()`/`validateAsync()` fallbacks), instead of a fabricated form facade incompatible with `[formField]`.
  - `react-tanstack-form`: `onSubmit`/`onSubmitAsync` now read `{value}` from TanStack Form's real context object and return the `{fields: {...}}` shape it expects, instead of treating the context object as the raw values and returning a bare error map.
  - `vue-vee-validate`: `validationSchema` is now a generic per-field function map (`(value) => true | string | Promise<...>`), the shape vee-validate's `useForm`/`useField` actually recognize, instead of Decorix's internal `ValidatorSchema`.
  - `vue-formkit`: the generated `validation` string now uses FormKit's own rule vocabulary (`length`, `matches`, `email`, `min`, `max`, ...) instead of Decorix's internal constraint names, which FormKit silently ignored.

## 0.1.0

Initial public release (decorators, builder API, native/custom/cross-field/async validation, JSON Schema, Zod, and the first 9 framework adapters). Predates this aggregated changelog and the per-package `CHANGELOG.md` files — see `ROADMAP.md`'s `DONE` section for the full V1–V5.3 development history behind it.
