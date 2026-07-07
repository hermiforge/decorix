# @hermiforge-decorix/vue-formkit

FormKit adapter for Decorix metadata. It generates FormKit-oriented schema nodes and optional runtime validation.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/vue-formkit vue @formkit/vue
```

Peer dependencies: `vue@3.5.39`, `@formkit/vue@2.1.0`. `@hermiforge-decorix/zod` is only needed if you opt into Zod-backed validation instead of the core facade — see Validator Notes below.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toFormKit} from '@hermiforge-decorix/vue-formkit';

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

const config = toFormKit(SignupDto, {
  initialValues: {name: 'Ada'}
});
```

`T` is inferred straight from `SignupDto` — `config.initialValues` and `config.validate`/`validateAsync` are already typed, no separate form-values type or cast needed.

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {useFormKitDecorix} from '@hermiforge-decorix/vue-formkit';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const config = useFormKitDecorix(SignupDto, {
  initialValues: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});

const result = config.validate?.({name: 'Ada', email: 'ada@example.com'});
```

## Validator Notes

`toFormKit`/`useFormKitDecorix` always return a `validate`/`validateAsync` pair, whether or not `options.validator` is passed: when omitted, they fall back to Decorix's core validator facade — no extra install needed. Pass an explicit adapter through `options.validator` (as in the Builder Model example above) only if you want a different engine, such as Zod via `createZodValidatorAdapter()`. `registerZodValidator()`'s global registration is **not** consulted here.

**Known limitation**: the `validation` string on each schema node only carries constraints that map to a real FormKit rule (`required`, `email`, `url`, `min`, `max`, `length`, `matches`). Constraints without a FormKit-native equivalent (e.g. `slug`, `integer`, `past`, `future`, `equalsField`, custom constraints) are omitted from that string — FormKit would otherwise silently ignore unrecognized rule names. Those constraints remain enforced through `config.validate()` / `config.validateAsync()`; they just aren't surfaced as inline FormKit validation messages.


## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
