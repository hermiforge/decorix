# Core Concepts

## One model, many targets

Decorix starts from a simple principle: describe a business entity **once**
(its fields, their constraints, their labels), then derive from that neutral
description everything an application needs — runtime validation, form
configuration for a given framework, or a JSON schema for
documentation/interoperability. The model knows nothing about any framework;
*adapters* are what translate the metadata toward a specific target (see
[Form Adapters](./adapters.md)).

## Decorators vs Builder

Both syntaxes produce exactly the same internal metadata (`ModelMetadata`) —
the choice is a matter of style, not capability:

| | Decorators | Builder |
| --- | --- | --- |
| Style | TypeScript class with `@Model` / `@Required` / ... | Functional object with `model()` / `stringField()` / ... |
| Requires | `experimentalDecorators: true` in `tsconfig.json` | Nothing special |
| Nested array field types | No declarative element type (a CLI limitation, see below) | Explicitly typed `.item(...)` |
| Fits well with | DTOs close to existing classes (Nest, ORM) | Dynamically defined or generated schemas |

Nothing stops you from mixing both styles across different models in the
same project.

## Metadata and the constraint registry

Each field carries a list of constraints shaped as
`{ name, options, message, groups }`. Native constraints (presence, strings,
numbers, dates, collections, enums, cross-field) are registered in a default
`ConstraintRegistry` (`defaultConstraintRegistry`) — see the full table in
[`packages/core/README.md`](../packages/core/README.md#constraint-reference).
You can register your own constraints in that registry or in an isolated
registry (useful for tests, or to avoid name collisions between modules) —
see [Validation Guide](./validation-guide.md#custom-constraints).

## `ValidatorAdapter`: the neutral, optional contract

Adapters that run validation at runtime (React Hook Form, TanStack Form,
VeeValidate, FormKit, Nest) accept an optional `options.validator` shaped as
the neutral `ValidatorAdapter` contract from `@hermiforge-decorix/core`. **You
don't have to install or wire up anything** to get working validation: when
`options.validator` is omitted, these adapters fall back to the core
validator facade (`createCoreValidatorAdapter()`), which fully implements
native/custom/cross-field/async constraints on its own.

Pass an explicit adapter only when you want a different underlying engine —
typically Zod, if your app already builds Zod schemas elsewhere and you want
a single validation library across the codebase:

```ts
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';

const validator = createZodValidatorAdapter();
const config = toReactHookForm(RegisterUserDto, {validator});
```

`registerZodValidator()` registers Zod in a **global registry**
(`getDefaultValidatorAdapter()`), but as of this writing the adapters listed
above do not consult that global registry when `options.validator` is
omitted — they go straight to the core facade instead. In practice this means
registering a default adapter only matters for code you write that calls
`requireValidatorAdapter()`/`resolveValidatorAdapter()` yourself; it does not
implicitly wire itself into `toReactHookForm`/`toTanStackForm`/`toVeeValidate`/
`toFormKit`/`DecorixPipe` calls. Always pass `{validator}` explicitly if you
need a specific engine.

Two adapters behave differently:

- **Angular Reactive Forms** builds a core-backed schema automatically, but
  only when the model has cross-field/object or async constraints; simple
  per-field constraints stay native-`ValidatorFn`-only and need no adapter at
  all.
- **Angular Signal Forms** never uses a `ValidatorAdapter`: constraints are
  mapped directly onto Angular's own native validators through Decorix's
  constraint registry, bypassing this contract entirely.

## Positioning: validation, not transformation

Decorix is a pure validator: it checks whether a value satisfies a constraint
and reports issues, but it never mutates or coerces the input (no automatic
trimming, no string→number coercion, no date parsing). If you need that,
pre-process the value yourself (or through your form library) before it
reaches Decorix.
