# @hermiforge-decorix/core

Framework-neutral metadata, decorators, builder API, and validator registry for Decorix models.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add @hermiforge-decorix/core
```

Peer dependencies: none.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required, getModelMetadata} from '@hermiforge-decorix/core';

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
import {model, stringField} from '@hermiforge-decorix/core';

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
import {defineConstraint, Model, model, numberField, validate} from '@hermiforge-decorix/core';

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
import {createCoreValidatorAdapter, hasAsyncConstraints, runSchemaAsync} from '@hermiforge-decorix/core';

const schema = createCoreValidatorAdapter().createSchema(metadata);
const result = hasAsyncConstraints(metadata)
  ? await runSchemaAsync(schema, value)
  : schema.validate(value);
```

## Constraint Reference

Every native constraint follows the same three-name convention: a PascalCase
decorator, a same-named camelCase builder method, and the registered
constraint name (used as `issue.constraint` and, by default, the
`decorix.<name>` issue code — e.g. `@MinLength(2)` / `.minLength(2)` produce
`constraint: 'minLength'` and `code: 'decorix.minLength'`). Type mismatches
(e.g. a non-string given to `minLength`) produce `code: 'decorix.type'`
instead, with `params: {expected: '<type>'}`.

| Category | Decorator | Builder method | Registered name |
| --- | --- | --- | --- |
| Presence/nullity | `@Required` | `.required()` | `required` |
| | `@Optional` | `.optional()` | `optional` |
| | `@Nullable` | `.nullable()` | `nullable` |
| | `@NotNull` | `.notNull()` | `notNull` |
| | `@NotUndefined` | `.notUndefined()` | `notUndefined` |
| | `@NotEmpty` | `.notEmpty()` | `notEmpty` |
| | `@NotBlank` | `.notBlank()` | `notBlank` |
| Cross-field | `@EqualsField` | `.equalsField(path)` | `equalsField` |
| | `@NotEqualsField` | `.notEqualsField(path)` | `notEqualsField` |
| | `@GreaterThanField` | `.greaterThanField(path)` | `greaterThanField` |
| | `@GreaterOrEqualField` | `.greaterOrEqualField(path)` | `greaterOrEqualField` |
| | `@LessThanField` | `.lessThanField(path)` | `lessThanField` |
| | `@LessOrEqualField` | `.lessOrEqualField(path)` | `lessOrEqualField` |
| | `@BeforeField` | `.beforeField(path)` | `beforeField` |
| | `@AfterField` | `.afterField(path)` | `afterField` |
| | `@RequiredIf` | `.requiredIf(predicate)` | `requiredIf` |
| | `@ForbiddenIf` | `.forbiddenIf(predicate)` | `forbiddenIf` |
| Strings | `@MinLength` | `.minLength(n)` | `minLength` |
| | `@MaxLength` | `.maxLength(n)` | `maxLength` |
| | `@Length` | `.length(min, max)` | `length` |
| | `@Pattern` | `.pattern(regex)` | `pattern` |
| | `@Email` | `.email()` | `email` |
| | `@Url` | `.url()` | `url` |
| | `@Uuid` | `.uuid()` | `uuid` |
| | `@Slug` | `.slug()` | `slug` |
| | `@StartsWith` | `.startsWith(prefix)` | `startsWith` |
| | `@EndsWith` | `.endsWith(suffix)` | `endsWith` |
| | `@Contains` | `.contains(needle)` | `contains` |
| | `@Lowercase` | `.lowercase()` | `lowercase` |
| | `@Uppercase` | `.uppercase()` | `uppercase` |
| Numbers | `@Min` | `.min(n)` | `min` |
| | `@Max` | `.max(n)` | `max` |
| | `@Between` | `.between(min, max)` | `between` |
| | `@Positive` | `.positive()` | `positive` |
| | `@PositiveOrZero` | `.positiveOrZero()` | `positiveOrZero` |
| | `@Negative` | `.negative()` | `negative` |
| | `@NegativeOrZero` | `.negativeOrZero()` | `negativeOrZero` |
| | `@Integer` | `.integer()` | `integer` |
| | `@Finite` | `.finite()` | `finite` |
| | `@MultipleOf` | `.multipleOf(n)` | `multipleOf` |
| Dates | `@Past` | `.past()` | `past` |
| | `@PastOrPresent` | `.pastOrPresent()` | `pastOrPresent` |
| | `@Future` | `.future()` | `future` |
| | `@FutureOrPresent` | `.futureOrPresent()` | `futureOrPresent` |
| | `@Before` | `.before(date)` | `before` |
| | `@After` | `.after(date)` | `after` |
| | `@BetweenDates` | `.betweenDates(min, max)` | `betweenDates` |
| Collections | `@MinItems` | `.minItems(n)` | `minItems` |
| | `@MaxItems` | `.maxItems(n)` | `maxItems` |
| | `@Size` | `.size(min, max)` | `size` |
| | `@UniqueItems` | `.uniqueItems()` | `uniqueItems` |
| | `@NotEmptyArray` | `.notEmptyArray()` | `notEmptyArray` |
| Enums | `@Enum` | `.enum(values)` | `enum` |
| | `@OneOf` | `.oneOf(values)` | `oneOf` |
| | `@NotOneOf` | `.notOneOf(values)` | `notOneOf` |
| Object-level | `@ObjectConstraint` | `objectConstraint(...)` (top-level helper) | `objectConstraint` |

Source of truth: `packages/core/src/validation/native-constraints.ts` (registration) and `packages/core/src/decorators/constraints.ts` / `packages/core/src/builder/field-builders.ts` (surface).

## Validator Notes

`@hermiforge-decorix/core` only defines the `ValidatorAdapter` contract and global registry. Register a custom adapter with `registerValidatorAdapter`, or use `registerZodValidator()` from `@hermiforge-decorix/zod` before calling adapters that require runtime validation.


## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
