# JSON Schema (export/import)

`@hermiforge-decorix/json-schema` converts Decorix metadata to and from JSON
Schema draft 2020-12, without depending on a `ValidatorAdapter`.

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/json-schema
```

## Export

```ts
import {Email, Label, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toJsonSchema} from '@hermiforge-decorix/json-schema';

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

Native constraints map onto their standard JSON Schema keywords
(`minLength`, `format: "email"`, numeric bounds, `enum`, array keywords,
...). Any constraint with no standard equivalent (custom constraints,
cross-field) is preserved under the `x-decorix-constraints` extension (name,
`async`, options) so nothing is lost on a round trip.

## Import

`fromJsonSchema` performs the best-effort inverse: standard keywords map back
to native constraints, and `x-decorix-constraints` entries are restored
verbatim — `toJsonSchema(fromJsonSchema(x))` is stable for a schema produced
by Decorix. Arbitrary custom validator/predicate functions cannot be
reconstructed and stay preserved as the `'[function]'` sentinel.

```ts
import {validate} from '@hermiforge-decorix/core';
import {fromJsonSchema} from '@hermiforge-decorix/json-schema';

const metadata = fromJsonSchema({
  title: 'SignupDto',
  type: 'object',
  properties: {
    name: {type: 'string', minLength: 2},
    email: {type: 'string', format: 'email'}
  },
  required: ['name', 'email']
});

validate({name: 'Al', email: 'al@example.com'}, metadata);
```

## Security: only import schemas you trust

An imported `pattern` keyword (or a `RegExp` restored from
`x-decorix-constraints`) becomes a **live** constraint, re-run on every
validation. A schema from an untrusted source (a third-party upload, an
unaudited import) could carry a catastrophically backtracking pattern
(ReDoS) — `fromJsonSchema` applies no complexity/length limit on imported
patterns. Only call `fromJsonSchema` on schemas you trust: ones produced by
`toJsonSchema`, or otherwise audited beforehand.

Full reference and mapping details: [`packages/adapters/json-schema/README.md`](../packages/adapters/json-schema/README.md).
