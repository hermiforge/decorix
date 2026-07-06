# @decorix/cli

Command-line interface for generating artifacts from Decorix models. It loads a
DTO entry module (TypeScript or JavaScript), discovers `@Model` classes and
builder metadata, and emits schemas or framework re-export modules.

## Install

```sh
pnpm add -D @decorix/cli
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
```

`--model` selects by model name or export name; omit it when the entry exports a
single model. `--out` writes to a file, otherwise the artifact prints to stdout.

The `zod` and `angular-validators` commands emit thin TypeScript modules that
re-export `toZod(Model)` / `toReactiveFormConfig(Model)` from the entry, so
constraint functions never need to be serialized.

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
import {discoverModels, renderJsonSchema, selectModel} from '@decorix/cli';

const models = discoverModels(await import('./src/dtos.ts'));
const json = renderJsonSchema(selectModel(models, 'UserDto'));
```

## Security Note

`scan`, `json-schema`, `zod`, and `angular-validators` all **execute** the
entry module you point them at (via `tsx`/esbuild), the same way `node` or
`import()` would — this is not a static parser. Only run the CLI against DTO
files you trust; do not point it at an entry from an unreviewed third-party
source (e.g. an unmerged PR, a downloaded template) without reading it first,
since any top-level code in that file runs with your local Node permissions.

## Coverage

Only 3 of the 9 `@decorix/*` adapters have a dedicated CLI command today
(`json-schema`, `zod` via `decorix zod`, and Angular Reactive Forms via
`decorix angular-validators`). For React Hook Form, TanStack Form, VeeValidate,
FormKit, Angular Signal Forms, or Nest, import the adapter's `toXxx()` function
directly in your code instead of going through the CLI — see each package's
README under `packages/adapters/<name>/README.md`.

## License

LGPL-3.0-or-later — see the [repository LICENSE](https://github.com/hermiforge/decorix/blob/main/LICENSE).
