# @hermiforge-decorix/nest

![Decorix](../../../decorix.png)

Nest-compatible validation pipe for Decorix metadata.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/nest @nestjs/common
```

Peer dependencies: `@nestjs/common@11.1.27`. `@hermiforge-decorix/zod` is only needed if you opt into Zod-backed validation — see Validator Notes below.

## Decorated Class

```ts
import {Email, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {DecorixPipe} from '@hermiforge-decorix/nest';

@Model('SignupDto')
class SignupDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  email!: string;
}

const pipe = DecorixPipe(SignupDto);
const value = pipe.transform({name: 'Ada', email: 'ada@example.com'});
```

`T` is inferred straight from `SignupDto` — `transform`'s return type is already `SignupDto`, matching a controller handler typed `@Body(DecorixPipe(SignupDto)) body: SignupDto` with no cast needed.

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {DecorixPipe} from '@hermiforge-decorix/nest';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short'),
  email: stringField().required('Email is required').email('Invalid email')
});

const pipe = DecorixPipe(SignupDto, {
  validator: createZodValidatorAdapter()
});
```

## Validator Notes

`DecorixPipe` performs runtime validation. When `options.validator` is omitted, it falls back to Decorix's core validator facade — no extra install needed. Pass an explicit adapter through `options.validator` (as in the Builder Model example above) only if you want a different engine, such as Zod via `createZodValidatorAdapter()`. `registerZodValidator()`'s global registration is **not** consulted here. Failed validation throws `DecorixValidationException` with a 400-style response body.


## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
