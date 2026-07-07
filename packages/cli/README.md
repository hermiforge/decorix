# @hermiforge-decorix/cli

Command-line interface for generating artifacts from Decorix models. It loads a
DTO entry module (TypeScript or JavaScript), discovers `@Model` classes and
builder metadata, and emits schemas or framework re-export modules.

> Full usage guide: [`docs/`](https://github.com/hermiforge/decorix/blob/main/docs/README.md) (narrative walkthrough beyond this package's API reference).

## Install

```sh
pnpm add -D @hermiforge-decorix/cli
```

## Usage

```sh
# List the models found in an entry module
decorix scan ./src/dtos.ts

# Emit JSON Schema (stdout or --out file)
decorix json-schema ./src/dtos.ts --model UserDto --out user.schema.json

# Emit a thin Zod schema module referencing the entry
decorix zod ./src/dtos.ts --model UserDto --out user.zod.ts

# Emit an Angular reactive form config module
decorix angular-validators ./src/dtos.ts --model UserDto --out user.form.ts

# Emit an Angular Signal Forms module
decorix angular-signal ./src/dtos.ts --model UserDto --out user.signal.ts

# Emit a React Hook Form config module
decorix react-hook-form ./src/dtos.ts --model UserDto --out user.rhf.ts

# Emit a TanStack Form config module
decorix react-tanstack-form ./src/dtos.ts --model UserDto --out user.tanstack.ts

# Emit a FormKit schema config module
decorix vue-formkit ./src/dtos.ts --model UserDto --out user.formkit.ts

# Emit a VeeValidate config module
decorix vue-vee-validate ./src/dtos.ts --model UserDto --out user.vee.ts

# Emit a Nest validation pipe module
decorix nest ./src/dtos.ts --model UserDto --out user.pipe.ts
```

`--model` selects by model name or export name; omit it when the entry exports a
single model. `--out` writes to a file, otherwise the artifact prints to stdout.

Every command other than `scan` and `json-schema` emits a thin TypeScript module
that re-exports the result of calling the matching adapter function
(`toZod(Model)`, `toReactiveFormConfig(Model)`, `toSignalForm(Model)`,
`toReactHookForm(Model)`, `toTanStackForm(Model)`, `toFormKit(Model)`,
`toVeeValidate(Model)`, `DecorixPipe(Model)`) from the entry, so constraint
functions never need to be serialized. The generated module imports the target
adapter package (e.g. `@hermiforge-decorix/zod`) — install it alongside the CLI in
your project.

## Requirements for decorator DTOs

The loader must be able to **export-discover** your models and transpile them
with legacy TypeScript decorators:

- **Export your DTOs.** `scan`/`json-schema`/… only see exported members
  (`export class UserDto` or `export const UserDto = model(...)`). A non-exported
  model is silently invisible.
- **Enable `experimentalDecorators`.** Decorix decorators are legacy decorators,
  so the entry must be transpiled with `"experimentalDecorators": true`. The CLI
  resolves the nearest `tsconfig.json` above your entry file (then the CWD) and
  applies it; a decorator-using project already sets this flag. If your DTO uses
  decorators and you see `Cannot read properties of undefined (reading 'constructor')`,
  your resolved tsconfig lacks the flag — pass `--tsconfig <file>` to point at one
  that sets it.

```sh
decorix scan ./src/dtos.ts --tsconfig ./tsconfig.json
```

## Programmatic API

```ts
import {discoverModels, renderJsonSchema, selectModel} from '@hermiforge-decorix/cli';

const models = discoverModels(await import('./src/dtos.ts'));
const json = renderJsonSchema(selectModel(models, 'UserDto'));
```

## Security Note

Every command **executes** the entry module you point it at (via `tsx`/esbuild),
the same way `node` or `import()` would — this is not a static parser. Only run the CLI against DTO
files you trust; do not point it at an entry from an unreviewed third-party
source (e.g. an unmerged PR, a downloaded template) without reading it first,
since any top-level code in that file runs with your local Node permissions.

## Coverage

Every `@hermiforge-decorix/*` adapter has a dedicated CLI command:

| Command | Adapter package |
| --- | --- |
| `json-schema` | `@hermiforge-decorix/json-schema` |
| `zod` | `@hermiforge-decorix/zod` |
| `angular-validators` | `@hermiforge-decorix/angular-reactive` |
| `angular-signal` | `@hermiforge-decorix/angular-signal` |
| `react-hook-form` | `@hermiforge-decorix/react-hook-form` |
| `react-tanstack-form` | `@hermiforge-decorix/react-tanstack-form` |
| `vue-formkit` | `@hermiforge-decorix/vue-formkit` |
| `vue-vee-validate` | `@hermiforge-decorix/vue-vee-validate` |
| `nest` | `@hermiforge-decorix/nest` |

## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
