# @hermiforge-decorix/react-hook-form

React Hook Form adapter for Decorix metadata. It generates default values, field rules, and a resolver backed by a Decorix validator.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/react-hook-form react react-hook-form
```

Peer dependencies: `react@19.2.7`, `react-hook-form@7.80.0`. `@hermiforge-decorix/zod` is only needed if you opt into Zod-backed validation — see Validator Notes below.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';

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

const config = toReactHookForm(SignupDto, {
  defaultValues: {name: 'Ada'}
});
```

`T` is inferred straight from `SignupDto` — `config.defaultValues`/`config.resolver` are already typed for `useForm<SignupDto>(...)`, no separate form-values type or `as` cast needed:

```ts
import {useForm} from 'react-hook-form';

const {register, handleSubmit, formState} = useForm<SignupDto>({
  defaultValues: config.defaultValues,
  resolver: config.resolver
});
```

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {useReactHookDecorix} from '@hermiforge-decorix/react-hook-form';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const config = useReactHookDecorix(SignupDto, {
  defaultValues: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});
```

## Validator Notes

`toReactHookForm` and `useReactHookDecorix` create a runtime resolver. When `options.validator` is omitted, they fall back to Decorix's core validator facade — no extra install needed, and it fully implements native/custom/cross-field/async constraints. Pass an explicit adapter through `options.validator` (as in the Builder Model example above) only if you want a different engine, such as Zod via `createZodValidatorAdapter()`. Note that `registerZodValidator()`'s global registration is **not** consulted here — always pass `{validator}` explicitly to opt into a non-default engine.


## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
