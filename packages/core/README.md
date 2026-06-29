# @decorix/core

Framework-neutral metadata, decorators, builder API, and validator registry for Decorix models.

## Install

```sh
pnpm add @decorix/core
```

Peer dependencies: none.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required, getModelMetadata} from '@decorix/core';

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

const metadata = getModelMetadata(SignupDto);
```

## Builder Model

```ts
import {model, stringField} from '@decorix/core';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});
```

## Validator Notes

`@decorix/core` only defines the `ValidatorAdapter` contract and global registry. Register a custom adapter with `registerValidatorAdapter`, or use `registerZodValidator()` from `@decorix/zod` before calling adapters that require runtime validation.

