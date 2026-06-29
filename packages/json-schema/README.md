# @decorix/json-schema

JSON Schema adapter for Decorix metadata. It emits JSON Schema draft 2020-12 objects from decorated classes or builder metadata.

## Install

```sh
pnpm add @decorix/core @decorix/json-schema
```

Peer dependencies: none.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@decorix/core';
import {toJsonSchema} from '@decorix/json-schema';

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

const schema = toJsonSchema(SignupDto);
```

## Builder Model

```ts
import {model, stringField} from '@decorix/core';
import {toJsonSchema} from '@decorix/json-schema';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const schema = toJsonSchema(SignupDto);
```

## Validator Notes

`@decorix/json-schema` emits schema data only and does not need a `ValidatorAdapter`.

