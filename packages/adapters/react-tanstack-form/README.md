# @decorix/react-tanstack-form

TanStack Form adapter for Decorix metadata. It generates default values and submit validators backed by a Decorix validator.

## Install

```sh
pnpm add @decorix/core @decorix/react-tanstack-form @decorix/zod zod react @tanstack/react-form
```

Peer dependencies: `react@19.2.7`, `@tanstack/react-form@1.33.0`.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toTanStackForm} from '@decorix/react-tanstack-form';

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

const errors = config.validators.onSubmit({name: 'A', email: 'bad'});
```

## Builder Model

```ts
import {model, stringField} from '@decorix/core';
import {createZodValidatorAdapter} from '@decorix/zod';
import {useTanStackDecorix} from '@decorix/react-tanstack-form';

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

