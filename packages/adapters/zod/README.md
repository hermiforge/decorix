# @hermiforge-decorix/zod

![Decorix](../../../decorix.png)

Zod adapter for Decorix metadata. It converts models to Zod schemas and provides a Zod-backed `ValidatorAdapter` for runtime validation.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/zod zod
```

Peer dependencies: `zod@4.4.3`.

## Decorated Class

```ts
import {Email, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toZod} from '@hermiforge-decorix/zod';
import type {z} from 'zod';

@Model('SignupDto')
class SignupDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  email!: string;
}

const schema = toZod(SignupDto);
const result = schema.safeParse({name: 'Ada', email: 'ada@example.com'});

// `T` is inferred straight from `SignupDto`, so the standard Zod idiom works immediately:
type Inferred = z.infer<typeof schema>; // = SignupDto
```

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {toZod} from '@hermiforge-decorix/zod';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short'),
  email: stringField().required('Email is required').email('Invalid email')
});

const schema = toZod(SignupDto);
```

## Async Validation

The Zod validator schema exposes `validateAsync`, which parses through
`safeParseAsync` and resolves async constraints. Models that declare async
constraints reject the synchronous `validate` (use `validateAsync` instead), and
custom constraints receive the runtime `group`, `locale`, and `services` from the
validation options.

```ts
const schema = createZodValidatorAdapter().createSchema(getModelMetadata(SignupDto));
const result = await schema.validateAsync!({name: 'Ada', email: 'ada@example.com'}, {services});
```

## Validator Notes

`registerZodValidator()` registers Zod in Decorix's global validator registry (`getDefaultValidatorAdapter()`), but the runtime adapters (React Hook Form, TanStack Form, VeeValidate, FormKit, Nest) don't consult that global registry when `options.validator` is omitted — they fall back to the core validator facade instead. To actually use Zod with those adapters, pass `createZodValidatorAdapter()` through `options.validator` explicitly on each call. `registerZodValidator()` is still useful if your own code resolves adapters through `requireValidatorAdapter()`/`resolveValidatorAdapter()` directly.

```ts
import {createZodValidatorAdapter, registerZodValidator} from '@hermiforge-decorix/zod';

registerZodValidator();

const validator = createZodValidatorAdapter();
```


## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
