# Decorix

Decorix describes TypeScript business models once and adapts the same neutral metadata to validation, forms, framework, and documentation targets.

## Packages

Install only the packages required by your target surface:

- `@decorix/core` provides decorators, the builder API, model metadata, and the generic validator registry.
- `@decorix/zod` converts metadata to Zod schemas and can register a Zod validator adapter.
- `@decorix/json-schema` converts metadata to JSON Schema draft 2020-12.
- `@decorix/angular-signal` exposes `toSignalForm` for Angular Signal Forms-oriented facades.
- `@decorix/angular-reactive` exposes `toReactiveFormConfig` for Angular Reactive Forms-oriented configuration.
- `@decorix/react-hook-form` exposes `toReactHookForm` and `useReactHookDecorix`.
- `@decorix/react-tanstack-form` exposes `toTanStackForm` and `useTanStackDecorix`.
- `@decorix/vue-vee-validate` exposes `toVeeValidate` and `useVeeDecorix`.
- `@decorix/vue-formkit` exposes `toFormKit` and `useFormKitDecorix`.
- `@decorix/nest` exposes a Nest-compatible validation pipe.

The former aggregate packages `@decorix/angular`, `@decorix/react`, and `@decorix/vue` are intentionally not used. Choose the one adapter package matching your framework library so peer dependencies stay narrow.

## Decorator Model

```ts
import {Email, Label, MaxLength, Min, MinLength, Model, Required} from '@decorix/core';

@Model('RegisterUserDto')
class RegisterUserDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  @MaxLength(50)
  @Label('Name')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  @Label('Email')
  email!: string;

  @Min(18, 'You must be an adult')
  age?: number;
}
```

## Builder Model

```ts
import {model, numberField, stringField} from '@decorix/core';

const RegisterUserDto = model('RegisterUserDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50).label('Name'),
  email: stringField().required('Email is required').email('Invalid email').label('Email'),
  age: numberField().min(18, 'You must be an adult').optional()
});
```

## Validator Registry

UI and Nest adapters depend on the neutral `ValidatorAdapter` contract from `@decorix/core`, not on Zod directly. Register a concrete adapter once, or pass one per adapter call.

```ts
import {registerZodValidator} from '@decorix/zod';
import {toReactHookForm} from '@decorix/react-hook-form';

registerZodValidator();

const config = toReactHookForm(RegisterUserDto);
```

For explicit wiring:

```ts
import {createZodValidatorAdapter} from '@decorix/zod';
import {toSignalForm} from '@decorix/angular-signal';

const validator = createZodValidatorAdapter();
const form = toSignalForm(RegisterUserDto, {validator});
```

Adapters that perform runtime validation, such as signal forms, React Hook Form, TanStack Form, VeeValidate, and Nest, require a validator adapter. Configuration-only adapters such as Angular Reactive Forms and FormKit can still emit field metadata without one and attach validation when an adapter is available.

## Package READMEs

Each published package has a short package-level README in `packages/core/README.md`, `packages/cli/README.md`, and `packages/adapters/*/README.md` with installation, peer dependencies, and direct usage examples.

## Examples

Every package has minimal typechecked examples in `examples/<package>/class-model.ts` and `examples/<package>/builder-model.ts`. They demonstrate generated configuration and validation without requiring a full Angular, React, or Vue application.

Run:

```sh
pnpm examples:typecheck
```

