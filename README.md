# Decorix

[![CI](https://github.com/hermiforge/decorix/actions/workflows/ci.yml/badge.svg)](https://github.com/hermiforge/decorix/actions/workflows/ci.yml)
[![License: LGPL-3.0-or-later](https://img.shields.io/badge/License-LGPL--3.0--or--later-blue.svg)](LICENSE)

Decorix describes TypeScript business models once and adapts the same neutral metadata to validation, forms, framework, and documentation targets.

**[Read the full usage guide in `docs/`](./docs/README.md)** for a getting-started walkthrough, core concepts, validation guide, adapter decision table, CLI usage, and JSON Schema import/export. This README stays a quick overview. *Version française : [`docs/fr/`](./docs/fr/README.md).*

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

React Hook Form, TanStack Form, VeeValidate, FormKit, and Nest accept an optional `options.validator` shaped as the neutral `ValidatorAdapter` contract from `@hermiforge-decorix/core`. You don't need to install or wire up anything: when `options.validator` is omitted, these adapters fall back to the core validator facade, which fully implements native/custom/cross-field/async constraints on its own.

```ts
import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';

const config = toReactHookForm(RegisterUserDto);
```

Pass an explicit adapter only when you want a different underlying engine (typically Zod, to share one validation library across your codebase):

```ts
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';

const validator = createZodValidatorAdapter();
const config = toReactHookForm(RegisterUserDto, {validator});
```

`registerZodValidator()` sets Zod as the global default adapter, but the adapters above don't consult that global default when `options.validator` is omitted — always pass `{validator}` explicitly to use a non-default engine. Angular Reactive Forms builds a core-backed schema automatically only when cross-field/object or async constraints are present. Angular Signal Forms never uses a `ValidatorAdapter` at all — its `options` type has no `validator` field; constraints map directly onto Angular's own native validators. See [`docs/core-concepts.md`](./docs/core-concepts.md#validatoradapter-the-neutral-optional-contract) for the full picture.

## Positioning: Validation, Not Transformation

Decorix is a pure validator: it checks whether a value satisfies a constraint and reports issues, but it never mutates or coerces the input (no automatic trimming, no string→number coercion, no date parsing). If you need that, pre-process the value yourself (or through your form library) before it reaches Decorix — a Decorix model always validates exactly the value it is given.

## Documentation

The [`docs/`](./docs) directory is a narrative usage guide: [getting started](./docs/getting-started.md), [core concepts](./docs/core-concepts.md), [the validation guide](./docs/validation-guide.md) (native/custom/cross-field/async constraints), [choosing a form adapter](./docs/adapters.md), the [`decorix` CLI](./docs/cli.md), [JSON Schema export/import](./docs/json-schema.md), and [troubleshooting](./docs/troubleshooting.md). It reads directly on GitHub — no build step. A dedicated documentation site is planned for later. A French mirror lives in [`docs/fr/`](./docs/fr).

## Package READMEs

Each published package has a short package-level README in `packages/core/README.md`, `packages/cli/README.md`, and `packages/adapters/*/README.md` with installation, peer dependencies, and direct usage examples. `docs/` links out to these rather than duplicating their content.

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

