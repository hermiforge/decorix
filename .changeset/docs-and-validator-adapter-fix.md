---
"@hermiforge-decorix/core": patch
"@hermiforge-decorix/cli": patch
"@hermiforge-decorix/zod": patch
"@hermiforge-decorix/json-schema": patch
"@hermiforge-decorix/angular-signal": patch
"@hermiforge-decorix/angular-reactive": patch
"@hermiforge-decorix/react-hook-form": patch
"@hermiforge-decorix/react-tanstack-form": patch
"@hermiforge-decorix/vue-vee-validate": patch
"@hermiforge-decorix/vue-formkit": patch
"@hermiforge-decorix/nest": patch
---

Fix incorrect "requires a ValidatorAdapter, call `registerZodValidator()` once" guidance in the README of `react-hook-form`, `react-tanstack-form`, `vue-vee-validate`, `vue-formkit`, `nest`, and `zod`. In reality these adapters fall back to Decorix's core validator facade when `options.validator` is omitted, and never consult the global registry set by `registerZodValidator()` — pass `{validator}` explicitly to opt into a different engine. Also fixes a root README example that passed a nonexistent `validator` option to `toSignalForm` (Angular Signal Forms never accepts one).

Also adds a new `docs/` usage guide (English) with a French mirror in `docs/fr/`, linked from every package README.
