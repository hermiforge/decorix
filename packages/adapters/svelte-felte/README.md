# @hermiforge-decorix/svelte-felte

[Felte](https://felte.dev) adapter for Decorix metadata. It generates a `initialValues`/`validate`/`validateAsync` configuration meant to be spread into Felte's `createForm({...})` — this package never calls `createForm` itself.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/svelte-felte felte svelte
```

Peer dependencies: `svelte@^5.0.0`, `felte@^1.3.0`. Works in plain Svelte and in SvelteKit — Felte itself has no SvelteKit-specific requirement (unlike `sveltekit-superforms`). `@hermiforge-decorix/zod` is only needed if you opt into Zod-backed validation instead of the core facade — see Validator Notes below.

## Decorated Class

```ts
import {Email, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toFelteForm} from '@hermiforge-decorix/svelte-felte';
import {createForm} from 'felte';

@Model('SignupDto')
class SignupDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  email!: string;
}

const config = toFelteForm(SignupDto, {initialValues: {name: 'Ada'}});

const {form, errors} = createForm({
  initialValues: config.initialValues,
  validate: config.validate,
  onSubmit: (values) => {
    // ...
  }
});
```

```svelte
<form use:form>
  <input name="name" />
  {#if $errors.name}<span>{$errors.name[0]}</span>{/if}
  <input name="email" />
  {#if $errors.email}<span>{$errors.email[0]}</span>{/if}
</form>
```

`T` is inferred straight from `SignupDto` — `config.initialValues` is already typed, no separate form-values type or cast needed.

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {useFelteDecorix} from '@hermiforge-decorix/svelte-felte';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short'),
  email: stringField().required('Email is required').email('Invalid email')
});

const config = useFelteDecorix(SignupDto, {
  initialValues: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});

const errors = config.validate({name: 'Ada', email: 'ada@example.com'});
```

## Validator Notes

`toFelteForm`/`useFelteDecorix` always return a `validate`/`validateAsync` pair, whether or not `options.validator` is passed: when omitted, they fall back to Decorix's core validator facade — no extra install needed. Pass an explicit adapter through `options.validator` only if you want a different engine, such as Zod via `createZodValidatorAdapter()`. `registerZodValidator()`'s global registration is **not** consulted here.

Unlike FormKit, Felte has no named native rule vocabulary to map constraints onto — every constraint is enforced through the `validate`/`validateAsync` function, and every issue is reported (Felte accepts a `string[]` per field, so this adapter keeps every failing constraint's message, not just the first).

Pass models with async constraints through `validateAsync` (Felte accepts a `Promise`-returning validation function transparently); use `hasAsyncConstraints(metadata)` from `@hermiforge-decorix/core` to pick the right one at call time, matching the other adapters.

## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
