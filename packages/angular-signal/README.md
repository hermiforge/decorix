# @decorix/angular-signal

Angular Signal Forms-oriented facade adapter for Decorix metadata.

## Install

```sh
pnpm add @decorix/core @decorix/angular-signal @decorix/zod zod @angular/core @angular/forms
```

Peer dependencies: `@angular/core@22.0.3`, `@angular/forms@22.0.3`.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toSignalForm} from '@decorix/angular-signal';

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
import {model, stringField} from '@decorix/core';
import {createZodValidatorAdapter} from '@decorix/zod';
import {toSignalForm} from '@decorix/angular-signal';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const form = toSignalForm(SignupDto, {
  initialValue: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});
```

## Validator Notes

`toSignalForm` performs runtime validation and requires a `ValidatorAdapter`. Call `registerZodValidator()` once before creating forms, or pass a concrete adapter through `options.validator`.

