# Getting Started

## 1. Install the core

```sh
pnpm add @hermiforge-decorix/core
```

`@hermiforge-decorix/core` alone is enough to define models and validate
in-memory objects — no framework dependency is required at this stage.

## 2. Describe a model

Decorix offers two equivalent syntaxes for describing a model: class
**decorators**, or a functional **builder** API. Both produce the same
internal metadata and can be mixed within a single project depending on each
team's style.

Decorators:

```ts
import {Email, Label, MaxLength, Min, MinLength, Model, Required} from '@hermiforge-decorix/core';

@Model('RegisterUserDto')
class RegisterUserDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  @MaxLength(50)
  @Label('Name')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  @Label('Email')
  email!: string;

  @Min(18, 'You must be an adult')
  age?: number;
}
```

Builder:

```ts
import {model, numberField, stringField} from '@hermiforge-decorix/core';

const RegisterUserDto = model('RegisterUserDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50).label('Name'),
  email: stringField().required('Email is required').email('Invalid email').label('Email'),
  age: numberField().min(18, 'You must be an adult').optional()
});
```

See [Core Concepts](./core-concepts.md) for when to prefer one over the other.

## 3. Validate a value

```ts
import {validate} from '@hermiforge-decorix/core';

const result = validate({name: 'Al', email: 'not-an-email'}, RegisterUserDto);

if (!result.success) {
  for (const issue of result.issues) {
    console.log(issue.path, issue.code, issue.message);
  }
}
```

`validate` is synchronous and rejects any model containing an async
constraint (see [Validation Guide](./validation-guide.md#async-validation)) —
use `validateAsync` in that case.

## 4. Wire up a framework (optional)

If you use React Hook Form, Angular, Vue, or Nest, install the matching
adapter package alongside the core — see [Form Adapters](./adapters.md) for
the full list and a per-framework decision table. Example with React Hook
Form:

```sh
pnpm add @hermiforge-decorix/react-hook-form
```

```ts
import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';

const config = toReactHookForm(RegisterUserDto);
```

No Zod install needed: `toReactHookForm` falls back to Decorix's own core
validator facade when no `{validator}` is passed. Only add
`@hermiforge-decorix/zod` and pass `{validator: createZodValidatorAdapter()}`
if you specifically want Zod-backed validation instead — see
[Core Concepts](./core-concepts.md#validatoradapter-the-neutral-optional-contract).

## 5. Explore further

- [`examples/`](../examples) contains runnable scripts (`pnpm examples:run`) for every package, including advanced cases (async, custom constraints, cross-field, nested objects, groups) in `examples/advanced/`.
- The [`decorix` CLI](./cli.md) generates these same artifacts (JSON Schema, Zod, form config) without hand-writing integration code.
