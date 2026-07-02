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

## Custom Constraints

Define a reusable constraint once with `defineConstraint`, then apply it as a
decorator or as builder metadata. A per-field `message` overrides the
definition's default message; constraint names must be unique within a registry.

```ts
import {defineConstraint, Model, model, numberField, validate} from '@decorix/core';

const EvenNumber = defineConstraint<number, undefined>({
  name: 'evenNumber',
  validate: (value) => typeof value === 'number' && value % 2 === 0,
  message: 'Value must be even.'
});

// As a decorator
@Model('CounterDto')
class CounterDto {
  @EvenNumber.decorator('Count must be even')
  count!: number;
}

// As builder metadata (reuses the same registered name)
const CounterModel = model('CounterDto', {
  count: numberField().constraint('evenNumber', undefined, 'Count must be even')
});

validate({count: 3}, CounterModel); // { success: false, issues: [{ constraint: 'evenNumber', ... }] }
```

Use `defineAsyncConstraint` for async rules (resolved by `validateAsync`), and
pass a custom `ConstraintRegistry` as the second argument to `defineConstraint`
plus `validate(value, model, { registry })` to keep constraints isolated from
the default global registry.

## Validator Notes

`@decorix/core` only defines the `ValidatorAdapter` contract and global registry. Register a custom adapter with `registerValidatorAdapter`, or use `registerZodValidator()` from `@decorix/zod` before calling adapters that require runtime validation.

