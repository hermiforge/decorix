# @hermiforge-decorix/angular-signal

## 0.2.0

### Patch Changes

- e3fe90a: Fix 4 adapters published in `0.1.0` that produced output not recognized by their target library's real runtime API:

  - `angular-signal`: now builds a real Angular Signal Forms `FieldTree` via the actual `form()`/`schema` API (native validators + `validate()`/`validateAsync()` fallbacks), instead of a fabricated form facade incompatible with `[formField]`.
  - `react-tanstack-form`: `onSubmit`/`onSubmitAsync` now read `{value}` from TanStack Form's real context object and return the `{fields: {...}}` shape it expects, instead of treating the context object as the raw values and returning a bare error map.
  - `vue-vee-validate`: `validationSchema` is now a generic per-field function map (`(value) => true | string | Promise<...>`), the shape vee-validate's `useForm`/`useField` actually recognize, instead of Decorix's internal `ValidatorSchema`.
  - `vue-formkit`: the generated `validation` string now uses FormKit's own rule vocabulary (`length`, `matches`, `email`, `min`, `max`, ...) instead of Decorix's internal constraint names, which FormKit silently ignored.
  - @hermiforge-decorix/core@0.2.0
