# Validation Guide

## Native constraints

Decorix ships a full set of native constraints (presence/nullity, strings,
numbers, dates, collections, enums, cross-field, object-level). Every
constraint follows the same three-name convention: a PascalCase decorator, a
same-named camelCase builder method, and a registered constraint name (which
surfaces in `issue.constraint` and in the `decorix.<name>` code).

The exhaustive table (decorator / builder method / registered name, by
category) lives in
[`packages/core/README.md#constraint-reference`](../packages/core/README.md#constraint-reference)
— it is not duplicated here to avoid it drifting out of sync with the code
(`packages/core/src/validation/native-constraints.ts` remains the source of
truth).

A `null`/`undefined` value is ignored by every constraint outside
presence/nullity; an unexpected type (e.g. a number passed to `.minLength()`)
produces `code: 'decorix.type'` rather than silently failing.

## Cross-field and object constraints

Cross-field constraints (`EqualsField`, `GreaterThanField`, `RequiredIf`,
`ForbiddenIf`, ...) compare a field to another field of the same root object,
referenced by a `dot.path` string. Both the current field's value and the
peer field's value must be present for the comparison to apply (a missing
value skips the constraint, except `RequiredIf`/`ForbiddenIf`, which
explicitly handle absence).

```ts
import {EqualsField, Model, Required} from '@hermiforge-decorix/core';

@Model('ChangePasswordDto')
class ChangePasswordDto {
  @Required()
  password!: string;

  @Required()
  @EqualsField('password', 'Passwords must match')
  confirmPassword!: string;
}
```

For a rule that spans the whole object rather than a single field (e.g. "at
least one of these two fields must be set"), use
`@ObjectConstraint({ path, validator, message, groups })` or the
`objectConstraint(...)` builder helper.

See `examples/advanced/cross-field-and-object-constraints.ts` for a complete
runnable example.

## Custom constraints

`defineConstraint` (sync) and `defineAsyncConstraint` (async) register a
reusable constraint once. The result is **callable**: it applies directly as
a decorator (`@MyRule()`, just like native decorators) and can be passed **by
reference** to `.constraint(...)` on the builder — no magic strings,
refactor-safe.

```ts
import {defineConstraint, Model, model, numberField} from '@hermiforge-decorix/core';

const EvenNumber = defineConstraint<number, undefined>({
  name: 'evenNumber',
  validate: (value) => typeof value === 'number' && value % 2 === 0,
  message: 'Value must be even.'
});

@Model('CounterDto')
class CounterDto {
  @EvenNumber('Count must be even')
  count!: number;
}

const CounterModel = model('CounterDto', {
  count: numberField().constraint(EvenNumber, 'Count must be even')
});
```

Need an option payload (not just a message)? Use the generic
`@Constraint(name, options)` decorator or the string form of the builder
method, `.constraint(name, options)` — these options surface in
`issue.params`.

Pass a dedicated `ConstraintRegistry` as the second argument of
`defineConstraint` (and `validate(value, model, { registry })`) to isolate a
module's or a test's constraints from the default global registry.

## Async validation

`validateAsync` resolves constraints defined with `defineAsyncConstraint` (or
`createAsyncConstraint`); the synchronous `validate` **rejects** any model
that contains one, with an explicit error rather than a silently incomplete
result. For generic code that doesn't know upfront whether a model is async:

```ts
import {createCoreValidatorAdapter, hasAsyncConstraints, runSchemaAsync} from '@hermiforge-decorix/core';

const schema = createCoreValidatorAdapter().createSchema(metadata);
const result = hasAsyncConstraints(metadata)
  ? await runSchemaAsync(schema, value)
  : schema.validate(value);
```

Runtime adapters (React Hook Form, VeeValidate, TanStack Form, Angular Signal
Forms, Nest) all expose an equivalent async path (`validateAsync`,
`onSubmitAsync`, `validAsync`, an awaited transform, depending on the
adapter) — see the relevant package README.

## Validation groups

A constraint can be scoped to one or more groups via the `groups` option.
Ungrouped constraints always apply; grouped constraints only apply when
`options.group` (passed to `validate`/`validateAsync`) matches. Useful for
"create" vs "edit" scenarios on the same model. See
`examples/advanced/nested-and-groups.ts`.

## Localizing native messages

Native constraint messages default to English. Register a per-locale
dictionary with `registerLocale` (keyed by constraint name, e.g. `required`,
`minLength`, `email`, `min`) and pass `{locale}` to `validate`/`validateAsync`
to get translated messages:

```ts
import {registerLocale, validate} from '@hermiforge-decorix/core';

registerLocale('fr', {
  required: 'Cette valeur est requise.',
  minLength: (min: number) => `La valeur doit contenir au moins ${min} caractères.`,
  email: 'Adresse email invalide.',
  min: (min: number) => `La valeur doit être au moins ${min}.`
});

validate(payload, RegisterUserDto, {locale: 'fr'});
```

Decorix ships only this registration mechanism, not a bundled translation for
every native constraint — a locale/constraint pair with no registered
translation falls back silently to the English default, and an explicit user
message (`.required('Message')` / `@Required('Message')`) always wins over
any translation. See `packages/core/README.md`'s "Locale / i18n" section for
the full API (`LocaleRegistry`, scoping via `ValidationOptions.localeRegistry`).

## Nested objects and arrays

A field can reference another Decorix model (nested object) or an array of a
primitive/object type. Validation recursively traverses nested objects and
arrays and reports full error paths (`address.city`, `items.0.name`, ...).
See `examples/advanced/nested-and-groups.ts`.
