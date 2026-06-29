# @decorix/zod

Zod adapter for Decorix metadata. It converts models to Zod schemas and provides a Zod-backed `ValidatorAdapter` for runtime validation.

## Install

```sh
pnpm add @decorix/core @decorix/zod zod
```

Peer dependencies: `zod@4.4.3`.

## Decorated Class

```ts
import {Email, MinLength, Model, Required} from '@decorix/core';
import {toZod} from '@decorix/zod';

@Model('SignupDto')
class SignupDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  email!: string;
}

const schema = toZod(SignupDto);
const result = schema.safeParse({name: 'Ada', email: 'ada@example.com'});
```

## Builder Model

```ts
import {model, stringField} from '@decorix/core';
import {toZod} from '@decorix/zod';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short'),
  email: stringField().required('Email is required').email('Invalid email')
});

const schema = toZod(SignupDto);
```

## Validator Notes

Call `registerZodValidator()` once to make Zod the default Decorix validator for runtime adapters, or pass `createZodValidatorAdapter()` through `options.validator`.

```ts
import {createZodValidatorAdapter, registerZodValidator} from '@decorix/zod';

registerZodValidator();

const validator = createZodValidatorAdapter();
```

