# @hermiforge-decorix/cli

## 0.3.0

### Patch Changes

- cd70da7: Fix `loadEntry` failing to resolve prebuilt package imports (observed with `@angular/core`'s `fesm2022` bundle under pnpm) with `Cannot find module '...core.mjs?namespace=...'`. The loader now registers tsx globally via `register()` instead of the scoped `tsImport()` API, which was unconditionally tagging every resolved module URL with an isolation query string that broke resolution of some prebuilt ESM exports.
- Updated dependencies [56f6198]
  - @hermiforge-decorix/core@0.3.0
  - @hermiforge-decorix/json-schema@0.3.0

## 0.2.1

### Patch Changes

- d73f4d4: Fix incorrect "requires a ValidatorAdapter, call `registerZodValidator()` once" guidance in the README of `react-hook-form`, `react-tanstack-form`, `vue-vee-validate`, `vue-formkit`, `nest`, and `zod`. In reality these adapters fall back to Decorix's core validator facade when `options.validator` is omitted, and never consult the global registry set by `registerZodValidator()` — pass `{validator}` explicitly to opt into a different engine. Also fixes a root README example that passed a nonexistent `validator` option to `toSignalForm` (Angular Signal Forms never accepts one).

  Also adds a new `docs/` usage guide (English) with a French mirror in `docs/fr/`, linked from every package README.

- Updated dependencies [d73f4d4]
  - @hermiforge-decorix/core@0.2.1
  - @hermiforge-decorix/json-schema@0.2.1

## 0.2.0

### Minor Changes

- e9e49f9: Add CLI commands for the 6 previously uncovered adapters: `angular-signal`, `react-hook-form`, `react-tanstack-form`, `vue-formkit`, `vue-vee-validate`, and `nest`. All 9 `@hermiforge-decorix/*` adapters now have a dedicated `decorix` command.

### Patch Changes

- @hermiforge-decorix/json-schema@0.2.0
- @hermiforge-decorix/core@0.2.0
