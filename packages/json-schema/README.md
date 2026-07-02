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

## Import (JSON Schema → metadata)

`fromJsonSchema` performs the best-effort inverse of `toJsonSchema`: standard
keywords map back to native constraints, and Decorix-specific
`x-decorix-constraints` entries are restored verbatim, so
`toJsonSchema(fromJsonSchema(schema))` is stable for Decorix-produced schemas.
Arbitrary custom validator/predicate functions cannot be reconstructed and are
preserved as the `'[function]'` sentinel.

```ts
import {validate} from '@decorix/core';
import {fromJsonSchema} from '@decorix/json-schema';

const metadata = fromJsonSchema({
  title: 'SignupDto',
  type: 'object',
  properties: {
    name: {type: 'string', minLength: 2},
    email: {type: 'string', format: 'email'}
  },
  required: ['name', 'email']
});

validate({name: 'Al', email: 'al@example.com'}, metadata); // { success: true, ... }
```

## Validator Notes

`@decorix/json-schema` emits schema data only and does not need a `ValidatorAdapter`.

