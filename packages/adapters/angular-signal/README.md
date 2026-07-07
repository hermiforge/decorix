# @hermiforge-decorix/angular-signal

Angular Signal Forms adapter for Decorix metadata. `toSignalForm` maps Decorix constraints onto
Angular's own native validators and calls the real `form()` from `@angular/forms/signals` — it
returns Angular's own `FieldTree`, not a Decorix-specific facade. Bind it with `[formField]`, read
`form.field().errors()`/`.valid()`, and submit with the real `submit()` function, exactly as the
[Angular Signal Forms docs](https://angular.dev/guide/forms/signals) describe.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/angular-signal @angular/core @angular/forms
```

Peer dependencies: `@angular/core@22.0.3`, `@angular/forms@22.0.3`.

Unlike other Decorix adapters, this one does **not** need a `ValidatorAdapter`/Zod: constraints are
mapped directly onto Angular's native validators (or `validate()`/`validateAsync()` fallbacks)
through Decorix's constraint registry, the same way `@hermiforge-decorix/angular-reactive` does.

## Decorated Class

```ts
import {Email, Label, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toSignalForm} from '@hermiforge-decorix/angular-signal';
import {FormField, submit} from '@angular/forms/signals';

// A model field literally named `name` collides with `FieldTree`'s own
// `Function.prototype.name` at the type level — use another name (Angular's own docs
// avoid it the same way, e.g. `first`/`last` instead of `name`).
@Model('SignupDto')
class SignupDto {
  @Required('Full name is required')
  @MinLength(2, 'Name is too short')
  @Label('Name')
  fullName!: string;

  @Required('Email is required')
  @Email('Invalid email')
  email!: string;
}

@Component({
  imports: [FormField],
  template: `
    <input [formField]="signupForm.fullName" />
    <input [formField]="signupForm.email" />
    @if (signupForm.email().invalid()) {
      <span>{{ signupForm.email().errors()[0].message }}</span>
    }
  `
})
class SignupComponent {
  // `toSignalForm` must run in an Angular injection context — a component field
  // initializer (like here) always is one.
  signupForm = toSignalForm<{fullName: string; email: string}>(SignupDto, {
    initialValue: {fullName: 'Ada', email: 'ada@example.com'}
  });

  onSubmit() {
    submit(this.signupForm, {action: async () => console.log(this.signupForm().value())});
  }
}
```

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {toSignalForm} from '@hermiforge-decorix/angular-signal';

const SignupDto = model('SignupDto', {
  fullName: stringField().required('Full name is required').minLength(2, 'Name is too short').label('Name'),
  email: stringField().required('Email is required').email('Invalid email')
});

const signupForm = toSignalForm<{fullName: string; email: string}>(SignupDto, {
  initialValue: {fullName: 'Ada'}
});
```

## Async Validation

Custom async constraints are wired through Angular's own `validateAsync()`/`resource()`. Since
`resource()` needs an injection context too, pass `options.injector` when `toSignalForm` isn't called
from a component/service field initializer (e.g. in a plain factory function):

```ts
const signupForm = toSignalForm(SignupDto, {initialValue, injector: inject(Injector)});
```

## Constraint Mapping

Native Angular validators are used when available: `required`, `minLength`, `maxLength`, `min`,
`max`, `email`, `pattern`. Every other constraint (custom, cross-field like `EqualsField`) runs
through Angular's `validate()`; async constraints run through `validateAsync()`/`resource()`.

**Known scope**: cross-field constraints are resolved at the top level of the model only (no nested
object/array cross-field validation); `disabled()`/`hidden()` dynamic logic isn't generated (declare
those yourself in the schema if needed).

## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
