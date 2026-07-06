# @decorix/vue-vee-validate

VeeValidate adapter for Decorix metadata. It generates initial values, fields, and a validation schema backed by a Decorix validator.

## Install

```sh
pnpm add @decorix/core @decorix/vue-vee-validate @decorix/zod zod vue vee-validate
```

Peer dependencies: `vue@3.5.39`, `vee-validate@4.15.1`.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toVeeValidate} from '@decorix/vue-vee-validate';

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

const config = toVeeValidate(SignupDto, {
  initialValues: {name: 'Ada'}
});

const result = config.validate({name: 'Ada', email: 'ada@example.com'});
```

## Builder Model

```ts
import {model, stringField} from '@decorix/core';
import {createZodValidatorAdapter} from '@decorix/zod';
import {useVeeDecorix} from '@decorix/vue-vee-validate';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const config = useVeeDecorix(SignupDto, {
  initialValues: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});
```

## Validator Notes

`toVeeValidate` and `useVeeDecorix` create a runtime validation schema and require a `ValidatorAdapter`. Call `registerZodValidator()` once, or pass an adapter through `options.validator`.


## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
