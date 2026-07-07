# @hermiforge-decorix/solid-felte

![Decorix](../../../decorix.png)

[Felte](https://felte.dev) adapter for Decorix metadata (SolidJS, via `@felte/solid`). It generates an `initialValues`/`validate`/`validateAsync` configuration meant to be spread into `createForm({...})` — this package never calls `createForm` itself.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/solid-felte @felte/solid solid-js
```

Peer dependencies: `solid-js@^1.2.0`, `@felte/solid@^1.2.0`. `@hermiforge-decorix/zod` is only needed if you opt into Zod-backed validation instead of the core facade — see Validator Notes below.

## Decorated Class

```tsx
import {Email, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toFelteForm} from '@hermiforge-decorix/solid-felte';
import {createForm} from '@felte/solid';

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

function SignupForm() {
  const {form, errors} = createForm({
    initialValues: config.initialValues,
    validate: config.validate,
    onSubmit: (values) => {
      // ...
    }
  });

  return (
    <form use:form>
      <input name="name" />
      {errors().name && <span>{errors().name?.[0]}</span>}
      <input name="email" />
      {errors().email && <span>{errors().email?.[0]}</span>}
    </form>
  );
}
```

`T` is inferred straight from `SignupDto` — `config.initialValues` is already typed, no separate form-values type or cast needed.

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {useFelteDecorix} from '@hermiforge-decorix/solid-felte';

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

Pass models with async constraints through `validateAsync` (Felte accepts a `Promise`-returning validation function transparently); use `hasAsyncConstraints(metadata)` from `@hermiforge-decorix/core` to pick the right one at call time, matching the other adapters. Identical mapping logic to `@hermiforge-decorix/svelte-felte` — only the target package (`@felte/solid` instead of `felte`) differs, since Felte exposes the same `ValidationFunction` contract across every framework integration it supports.

## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
