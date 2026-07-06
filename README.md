# Decorix

[![CI](https://github.com/hermiforge/decorix/actions/workflows/ci.yml/badge.svg)](https://github.com/hermiforge/decorix/actions/workflows/ci.yml)
[![License: LGPL-3.0-or-later](https://img.shields.io/badge/License-LGPL--3.0--or--later-blue.svg)](LICENSE)

Decorix describes TypeScript business models once and adapts the same neutral metadata to validation, forms, framework, and documentation targets.

## Packages

Install only the packages required by your target surface:

- `@hermiforge-decorix/core` provides decorators, the builder API, model metadata, and the generic validator registry.
- `@hermiforge-decorix/cli` provides the `decorix` command-line tool for generating JSON Schema, Zod, and framework re-export artifacts (one command per adapter) from Decorix models.
- `@hermiforge-decorix/zod` converts metadata to Zod schemas and can register a Zod validator adapter.
- `@hermiforge-decorix/json-schema` converts metadata to JSON Schema draft 2020-12.
- `@hermiforge-decorix/angular-signal` exposes `toSignalForm` for Angular Signal Forms-oriented facades.
- `@hermiforge-decorix/angular-reactive` exposes `toReactiveFormConfig` for Angular Reactive Forms-oriented configuration.
- `@hermiforge-decorix/react-hook-form` exposes `toReactHookForm` and `useReactHookDecorix`.
- `@hermiforge-decorix/react-tanstack-form` exposes `toTanStackForm` and `useTanStackDecorix`.
- `@hermiforge-decorix/vue-vee-validate` exposes `toVeeValidate` and `useVeeDecorix`.
- `@hermiforge-decorix/vue-formkit` exposes `toFormKit` and `useFormKitDecorix`.
- `@hermiforge-decorix/nest` exposes a Nest-compatible validation pipe.

The former aggregate packages `@hermiforge-decorix/angular`, `@hermiforge-decorix/react`, and `@hermiforge-decorix/vue` are intentionally not used. Choose the one adapter package matching your framework library so peer dependencies stay narrow.

## Decorator Model

```ts
import {Email, Label, MaxLength, Min, MinLength, Model, Required} from '@hermiforge-decorix/core';

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
import {model, numberField, stringField} from '@hermiforge-decorix/core';

const RegisterUserDto = model('RegisterUserDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50).label('Name'),
  email: stringField().required('Email is required').email('Invalid email').label('Email'),
  age: numberField().min(18, 'You must be an adult').optional()
});
```

## Validator Registry

UI and Nest adapters depend on the neutral `ValidatorAdapter` contract from `@hermiforge-decorix/core`, not on Zod directly. Register a concrete adapter once, or pass one per adapter call.

```ts
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';

registerZodValidator();

const config = toReactHookForm(RegisterUserDto);
```

For explicit wiring:

```ts
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {toSignalForm} from '@hermiforge-decorix/angular-signal';

const validator = createZodValidatorAdapter();
const form = toSignalForm(RegisterUserDto, {validator});
```

Adapters that perform runtime validation, such as signal forms, React Hook Form, TanStack Form, VeeValidate, and Nest, require a validator adapter. Configuration-only adapters such as Angular Reactive Forms and FormKit can still emit field metadata without one and attach validation when an adapter is available.

## Positioning: Validation, Not Transformation

Decorix is a pure validator: it checks whether a value satisfies a constraint and reports issues, but it never mutates or coerces the input (no automatic trimming, no string→number coercion, no date parsing). If you need that, pre-process the value yourself (or through your form library) before it reaches Decorix — a Decorix model always validates exactly the value it is given.

## Package READMEs

Each published package has a short package-level README in `packages/core/README.md`, `packages/cli/README.md`, and `packages/adapters/*/README.md` with installation, peer dependencies, and direct usage examples.

## Examples

Every package has minimal typechecked examples in `examples/<package>/class-model.ts` and `examples/<package>/builder-model.ts`. They demonstrate generated configuration and validation without requiring a full Angular, React, or Vue application.

Run:

```sh
pnpm examples:typecheck
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the local setup, quality gate, and changeset workflow. Security issues should be reported per [SECURITY.md](SECURITY.md) rather than as a public issue.

## License

Decorix is licensed under the [GNU Lesser General Public License v3.0 or later](LICENSE) (LGPL-3.0-or-later). This copyleft applies to Decorix itself and to modifications distributed as part of it; applications that merely depend on `@hermiforge-decorix/*` packages through their published interfaces are not required to adopt the same license (see LICENSE, sections 0-6, and the incorporated [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.txt) for the exact terms).

