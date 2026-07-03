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

Define a reusable constraint once with `defineConstraint`. The result is
**callable**, so it applies directly as a decorator — just like the native
`@Required()` / `@Min(3)` — and can be passed **by reference** to the builder
`.constraint(...)` method (no magic strings). A per-field `message` overrides the
definition's default message; constraint names must be unique within a registry.

By convention the holding const is PascalCase (for decorator use) while the
registered `name` stays camelCase — it surfaces as `issue.constraint` and the
`decorix.<name>` issue code.

```ts
import {defineConstraint, Model, model, numberField, validate} from '@decorix/core';

const EvenNumber = defineConstraint<number, undefined>({
  name: 'evenNumber',
  validate: (value) => typeof value === 'number' && value % 2 === 0,
  message: 'Value must be even.'
});

// As a decorator — the constraint is callable, no `.decorator()`
@Model('CounterDto')
class CounterDto {
  @EvenNumber('Count must be even')
  count!: number;
}

// In the builder — by reference, fully typed and refactor-safe
const CounterModel = model('CounterDto', {
  count: numberField().constraint(EvenNumber, 'Count must be even')
});

validate({count: 3}, CounterModel); // { success: false, issues: [{ constraint: 'evenNumber', ... }] }
```

Need a per-field **option payload** (not just a message)? Use the generic
`@Constraint(name, options)` decorator or the string form of the builder method,
`.constraint(name, options)`. Both attach the options that your `validate`
receives and that surface as `issue.params`.

Use `defineAsyncConstraint` for async rules (resolved by `validateAsync`; also
callable as `@MyAsyncRule()`), and pass a custom `ConstraintRegistry` as the
second argument to `defineConstraint` plus `validate(value, model, { registry })`
to keep constraints isolated from the default global registry.

## Async Validation

`validateAsync` resolves async constraints (registered via `defineAsyncConstraint`
/ `createAsyncConstraint`), while the synchronous `validate` rejects them. The core
validator adapter exposes both `validate` and `validateAsync`; adapters can detect
async models with `hasAsyncConstraints(metadata)` and run the right path with
`runSchemaAsync(schema, value, options)` (prefers `validateAsync`, falls back to a
wrapped sync result).

```ts
import {createCoreValidatorAdapter, hasAsyncConstraints, runSchemaAsync} from '@decorix/core';

const schema = createCoreValidatorAdapter().createSchema(metadata);
const result = hasAsyncConstraints(metadata)
  ? await runSchemaAsync(schema, value)
  : schema.validate(value);
```

## Validator Notes

`@decorix/core` only defines the `ValidatorAdapter` contract and global registry. Register a custom adapter with `registerValidatorAdapter`, or use `registerZodValidator()` from `@decorix/zod` before calling adapters that require runtime validation.

