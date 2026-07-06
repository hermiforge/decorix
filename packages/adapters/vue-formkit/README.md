# @decorix/vue-formkit

FormKit adapter for Decorix metadata. It generates FormKit-oriented schema nodes and optional runtime validation.

## Install

```sh
pnpm add @decorix/core @decorix/vue-formkit vue @formkit/vue
```

Peer dependencies: `vue@3.5.39`, `@formkit/vue@2.1.0`.

For runtime `validate` support, also install a validator adapter such as Zod:

```sh
pnpm add @decorix/zod zod
```

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@decorix/core';
import {toFormKit} from '@decorix/vue-formkit';

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

const config = toFormKit(SignupDto, {
  initialValues: {name: 'Ada'}
});
```

## Builder Model

```ts
import {model, stringField} from '@decorix/core';
import {createZodValidatorAdapter} from '@decorix/zod';
import {useFormKitDecorix} from '@decorix/vue-formkit';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const config = useFormKitDecorix(SignupDto, {
  initialValues: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});

const result = config.validate?.({name: 'Ada', email: 'ada@example.com'});
```

## Validator Notes

This is a configuration-only adapter. It can emit FormKit schema without a `ValidatorAdapter`. Pass `options.validator` or call `registerZodValidator()` when you also want the returned config to include `validate`.

