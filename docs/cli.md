# `decorix` CLI

`@hermiforge-decorix/cli` generates artifacts (JSON Schema, Zod, per-framework
form configuration) straight from a model file, without hand-writing
integration code.

```sh
pnpm add -D @hermiforge-decorix/cli
```

## How it works

The CLI **loads and executes** your entry file (via `tsx`/esbuild, the same
way `node`/`import()` would), discovers exported `@Model` classes and builder
models, then emits either a JSON Schema or a thin TypeScript module that
re-exports the call to the matching adapter (`toZod(Model)`,
`toReactiveFormConfig(Model)`, `toSignalForm(Model)`, etc.) — constraint
functions are therefore never serialized.

```sh
# List the models found in an entry file
decorix scan ./src/dtos.ts

# Emit a JSON Schema
decorix json-schema ./src/dtos.ts --model UserDto --out user.schema.json

# Emit a Zod module
decorix zod ./src/dtos.ts --model UserDto --out user.zod.ts

# Emit a form configuration (one command per framework)
decorix angular-validators ./src/dtos.ts --model UserDto --out user.form.ts
decorix angular-signal ./src/dtos.ts --model UserDto --out user.signal.ts
decorix react-hook-form ./src/dtos.ts --model UserDto --out user.rhf.ts
decorix react-tanstack-form ./src/dtos.ts --model UserDto --out user.tanstack.ts
decorix vue-formkit ./src/dtos.ts --model UserDto --out user.formkit.ts
decorix vue-vee-validate ./src/dtos.ts --model UserDto --out user.vee.ts
decorix nest ./src/dtos.ts --model UserDto --out user.pipe.ts
```

`--model` selects by model name or export name; omit it when the file exports
a single model. `--out` writes to a file, otherwise the artifact prints to
stdout. The generated module imports the target adapter package (e.g.
`@hermiforge-decorix/zod`) — install it alongside the CLI in your project.

## Requirements for decorator DTOs

- **Export your DTOs.** Only exported members are discovered
  (`export class UserDto` or `export const UserDto = model(...)`).
- **`experimentalDecorators: true`.** Decorix decorators are legacy
  decorators; the CLI resolves the nearest `tsconfig.json` above your entry
  file (then the CWD) and applies it. If you see
  `Cannot read properties of undefined (reading 'constructor')`, the
  resolved tsconfig lacks this flag — pass `--tsconfig <file>` explicitly:

  ```sh
  decorix scan ./src/dtos.ts --tsconfig ./tsconfig.json
  ```

## Programmatic API

```ts
import {discoverModels, renderJsonSchema, selectModel} from '@hermiforge-decorix/cli';

const models = discoverModels(await import('./src/dtos.ts'));
const json = renderJsonSchema(selectModel(models, 'UserDto'));
```

## Security

Every command **executes** the entry file you point it at, exactly like
`node` or `import()` would — this is not a static parser. Only run the CLI
against files you trust; never point it at an entry from an unreviewed
third-party source (an unmerged PR, a downloaded template) without reading it
first, since any top-level code in that file runs with your local Node
permissions.

Full reference (options, coverage of all 9 adapters): [`packages/cli/README.md`](../packages/cli/README.md).
