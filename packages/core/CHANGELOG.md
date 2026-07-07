# @hermiforge-decorix/core

## 0.3.1

## 0.3.0

### Minor Changes

- 56f6198: Add locale/i18n support for native constraint messages: `LocaleRegistry`, `registerLocale`, `getLocaleMessage`, and a new `ValidationOptions.localeRegistry`. When `context.locale` matches a registered translation, `messageForConstraint`/`normalizeConstraintIssue` use it instead of the English default; missing locales/translations and explicit user message overrides behave exactly as before. Decorix ships the registration mechanism only, no bundled translation dictionary.

## 0.2.1

### Patch Changes

- d73f4d4: Fix incorrect "requires a ValidatorAdapter, call `registerZodValidator()` once" guidance in the README of `react-hook-form`, `react-tanstack-form`, `vue-vee-validate`, `vue-formkit`, `nest`, and `zod`. In reality these adapters fall back to Decorix's core validator facade when `options.validator` is omitted, and never consult the global registry set by `registerZodValidator()` — pass `{validator}` explicitly to opt into a different engine. Also fixes a root README example that passed a nonexistent `validator` option to `toSignalForm` (Angular Signal Forms never accepts one).

  Also adds a new `docs/` usage guide (English) with a French mirror in `docs/fr/`, linked from every package README.

## 0.2.0
