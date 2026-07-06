# @hermiforge-decorix/angular-reactive

Angular Reactive Forms adapter for Decorix metadata.

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/angular-reactive @angular/core @angular/forms
```

Peer dependencies: `@angular/core@22.0.3`, `@angular/forms@22.0.3`.

For runtime `validate` support, also install a validator adapter such as Zod:

```sh
pnpm add @hermiforge-decorix/zod zod
```

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toReactiveFormConfig} from '@hermiforge-decorix/angular-reactive';

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

const config = toReactiveFormConfig(SignupDto, {
  initialValue: {name: 'Ada'}
});

// Default mode: Angular ValidatorFn[] ready for Reactive Forms.
const nameValidators = config.fields[0]?.validators;
```

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {toReactiveFormConfig} from '@hermiforge-decorix/angular-reactive';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const config = toReactiveFormConfig(SignupDto, {
  validator: createZodValidatorAdapter()
});

const result = config.validate?.({name: 'Ada', email: 'ada@example.com'});
```

## Validation Modes

`toReactiveFormConfig()` generates Angular-compatible `ValidatorFn[]` by default. The generated validators use Angular error keys such as `required`, `minlength`, `maxlength`, `email`, `pattern`, `min`, and `max`; Decorix messages are included in the error payload when available.

```ts
const angularConfig = toReactiveFormConfig(SignupDto);
angularConfig.fields[0]?.validators; // ValidatorFn[]
```

Use `validationMode: 'descriptors'` when you need the framework-neutral Decorix constraint descriptors that older versions exposed in `validators`.

```ts
const descriptorConfig = toReactiveFormConfig(SignupDto, {
  validationMode: 'descriptors'
});

descriptorConfig.fields[0]?.validators; // {kind, value?, message?}[]
```

Use `validationMode: 'both'` during migration when Angular should receive `ValidatorFn[]` while your integration still needs descriptors.

```ts
const bothConfig = toReactiveFormConfig(SignupDto, {
  validationMode: 'both'
});

bothConfig.fields[0]?.validators; // ValidatorFn[]
bothConfig.fields[0]?.validatorDescriptors; // {kind, value?, message?}[]
```

## Async Validators

Async constraints cannot run inside Angular's synchronous `ValidatorFn`, so they
are emitted as `asyncValidators: AsyncValidatorFn[]` on the field config. The form
config also exposes `validateAsync` for full model validation resolving async and
cross-field constraints.

```ts
const config = toReactiveFormConfig(SignupDto);
config.fields[0]?.asyncValidators; // AsyncValidatorFn[] for async constraints
await config.validateAsync?.({name: 'Ada', email: 'ada@example.com'});
```

## Runtime Validation

Angular validators do not require a Decorix `ValidatorAdapter`. `options.validator` and `registerZodValidator()` only control the optional `config.validate`/`config.validateAsync` functions, which perform full model validation through the selected runtime validator adapter.

## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
