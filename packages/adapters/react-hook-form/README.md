# @decorix/react-hook-form

React Hook Form adapter for Decorix metadata. It generates default values, field rules, and a resolver backed by a Decorix validator.

## Install

```sh
pnpm add @decorix/core @decorix/react-hook-form @decorix/zod zod react react-hook-form
```

Peer dependencies: `react@19.2.7`, `react-hook-form@7.80.0`.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toReactHookForm} from '@decorix/react-hook-form';

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

const config = toReactHookForm(SignupDto, {
  defaultValues: {name: 'Ada'}
});
```

## Builder Model

```ts
import {model, stringField} from '@decorix/core';
import {createZodValidatorAdapter} from '@decorix/zod';
import {useReactHookDecorix} from '@decorix/react-hook-form';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const config = useReactHookDecorix(SignupDto, {
  defaultValues: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});
```

## Validator Notes

`toReactHookForm` and `useReactHookDecorix` create a runtime resolver and require a `ValidatorAdapter`. Call `registerZodValidator()` once, or pass an adapter through `options.validator`.

