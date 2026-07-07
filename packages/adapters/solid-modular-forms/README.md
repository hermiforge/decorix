# @hermiforge-decorix/solid-modular-forms

[Modular Forms](https://modularforms.dev) adapter for Decorix metadata (SolidJS). It generates an `initialValues`/`validate`/`validateAsync` configuration meant to be passed straight into `createForm({..., validate})` — this package never calls `createForm` itself.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/solid-modular-forms @modular-forms/solid solid-js
```

Peer dependencies: `solid-js@^1.3.1`, `@modular-forms/solid@^0.25.0`. `@hermiforge-decorix/zod` is only needed if you opt into Zod-backed validation instead of the core facade — see Validator Notes below.

## Decorated Class

```tsx
import {Email, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toModularForm} from '@hermiforge-decorix/solid-modular-forms';
import {createForm} from '@modular-forms/solid';

@Model('SignupDto')
class SignupDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  email!: string;
}

const config = toModularForm(SignupDto, {initialValues: {name: 'Ada'}});

function SignupForm() {
  const [signupForm, {Form, Field}] = createForm({
    initialValues: config.initialValues,
    validate: config.validate
  });

  return (
    <Form onSubmit={(values) => {/* ... */}}>
      <Field name="name">
        {(field, props) => (
          <>
            <input {...props} type="text" />
            {field.error && <span>{field.error}</span>}
          </>
        )}
      </Field>
    </Form>
  );
}
```

## Builder Model

```ts
import {model, stringField} from '@hermiforge-decorix/core';
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {useModularFormDecorix} from '@hermiforge-decorix/solid-modular-forms';

const SignupDto = model('SignupDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short'),
  email: stringField().required('Email is required').email('Invalid email')
});

const config = useModularFormDecorix(SignupDto, {
  initialValues: {name: 'Ada'},
  validator: createZodValidatorAdapter()
});

const errors = config.validate({name: 'Ada', email: 'ada@example.com'});
```

## Validator Notes

`toModularForm`/`useModularFormDecorix` always return a `validate`/`validateAsync` pair, whether or not `options.validator` is passed: when omitted, they fall back to Decorix's core validator facade — no extra install needed. Pass an explicit adapter through `options.validator` only if you want a different engine, such as Zod via `createZodValidatorAdapter()`. `registerZodValidator()`'s global registration is **not** consulted here.

Modular Forms' `FormOptions.validate` (the whole-form validator, like its own `zodForm(schema)` helper) expects a `FormErrors` object keyed by each field's **full dot-path** (e.g. `address.city`, `items.0.name`), with a single message per field — not the first-path-segment grouping used by React Hook Form's adapter, and not an array of messages like Felte's. This adapter builds that shape directly from `ValidationIssue.path`, keeping the first issue per exact path.

Pass models with async constraints through `validateAsync` (Modular Forms' `ValidateForm` type accepts a `Promise`-returning function); use `hasAsyncConstraints(metadata)` from `@hermiforge-decorix/core` to pick the right one at call time, matching the other adapters.

**Known limitation**: like Felte, Modular Forms has no named native rule vocabulary to map constraints onto — every constraint is enforced through the whole-form `validate`/`validateAsync` function rather than surfaced as a per-`Field` `validate` prop.

## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
