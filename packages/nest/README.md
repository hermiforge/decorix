# @decorix/nest

Nest-compatible validation pipe for Decorix metadata.

## Install

```sh
pnpm add @decorix/core @decorix/nest @decorix/zod zod @nestjs/common
```

Peer dependencies: `@nestjs/common@11.1.27`.

## Decorated Class

```ts
import {Email, MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {DecorixPipe} from '@decorix/nest';

registerZodValidator();

@Model('SignupDto')
class SignupDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  email!: string;
}

const pipe = DecorixPipe(SignupDto);
const value = pipe.transform({name: 'Ada', email: 'ada@example.com'});
```

## Builder Model

```ts
import {model, stringField} from '@decorix/core';
import {createZodValidatorAdapter} from '@decorix/zod';
import {DecorixPipe} from '@decorix/nest';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short'),
  email: stringField().required('Email is required').email('Invalid email')
});

const pipe = DecorixPipe(SignupDto, {
  validator: createZodValidatorAdapter()
});
```

## Validator Notes

`DecorixPipe` performs runtime validation and requires a `ValidatorAdapter`. Call `registerZodValidator()` once, or pass an adapter through `options.validator`. Failed validation throws `DecorixValidationException` with a 400-style response body.

