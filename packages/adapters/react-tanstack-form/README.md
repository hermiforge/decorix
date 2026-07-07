# @hermiforge-decorix/react-tanstack-form

TanStack Form adapter for Decorix metadata. It generates default values and submit validators backed by a Decorix validator.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/react-tanstack-form react @tanstack/react-form
```

Peer dependencies: `react@19.2.7`, `@tanstack/react-form@1.33.0`. `@hermiforge-decorix/zod` is only needed if you opt into Zod-backed validation — see Validator Notes below.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toTanStackForm} from '@hermiforge-decorix/react-tanstack-form';

@Model('SignupDto')
class SignupDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  @Label('Name')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  email!: string;
}

const config = toTanStackForm(SignupDto, {
  defaultValues: {name: 'Ada'}
});

// TanStack Form calls onSubmit with a context object ({value, ...}), not raw values.
const errors = config.validators.onSubmit({value: {name: 'A', email: 'bad'}});
// => {fields: {name: 'Name is too short', email: 'Invalid email'}}
```

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {useTanStackDecorix} from '@hermiforge-decorix/react-tanstack-form';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const config = useTanStackDecorix(SignupDto, {
  defaultValues: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});
```

## Validator Notes

`toTanStackForm` and `useTanStackDecorix` perform runtime validation. When `options.validator` is omitted, they fall back to Decorix's core validator facade — no extra install needed. Pass an explicit adapter through `options.validator` (as in the Builder Model example above) only if you want a different engine, such as Zod via `createZodValidatorAdapter()`. `registerZodValidator()`'s global registration is **not** consulted here.


## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
