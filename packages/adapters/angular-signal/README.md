# @hermiforge-decorix/angular-signal

Angular Signal Forms-oriented facade adapter for Decorix metadata.

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/angular-signal @hermiforge-decorix/zod zod @angular/core @angular/forms
```

Peer dependencies: `@angular/core@22.0.3`, `@angular/forms@22.0.3`.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {toSignalForm} from '@hermiforge-decorix/angular-signal';

registerZodValidator();

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

const form = toSignalForm(SignupDto, {
  initialValue: {name: 'Ada', email: 'ada@example.com'}
});

const result = form.submit();
```

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {toSignalForm} from '@hermiforge-decorix/angular-signal';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const form = toSignalForm(SignupDto, {
  initialValue: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});
```

## Async Validation

For models with async constraints, use the async form hooks — `validAsync()`,
`errorsAsync()`, `submitAsync()`, and per-field `errorsAsync()`/`validAsync()` —
which resolve async constraints. The synchronous hooks still throw on async
models, matching core validation semantics.

```ts
const form = toSignalForm(SignupDto, {initialValue: {name: 'Ada'}});
await form.username.errorsAsync();
const result = await form.submitAsync();
```

## Validator Notes

`toSignalForm` performs runtime validation and requires a `ValidatorAdapter`. Call `registerZodValidator()` once before creating forms, or pass a concrete adapter through `options.validator`.


## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
