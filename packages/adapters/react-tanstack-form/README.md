# @hermiforge-decorix/react-tanstack-form

TanStack Form adapter for Decorix metadata. It generates default values and submit validators backed by a Decorix validator.

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/react-tanstack-form @hermiforge-decorix/zod zod react @tanstack/react-form
```

Peer dependencies: `react@19.2.7`, `@tanstack/react-form@1.33.0`.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {toTanStackForm} from '@hermiforge-decorix/react-tanstack-form';

registerZodValidator();

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

`toTanStackForm` and `useTanStackDecorix` perform runtime validation and require a `ValidatorAdapter`. Call `registerZodValidator()` once, or pass an adapter through `options.validator`.


## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
