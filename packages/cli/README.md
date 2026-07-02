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

## Programmatic API

```ts
import {discoverModels, renderJsonSchema, selectModel} from '@decorix/cli';

const models = discoverModels(await import('./src/dtos.ts'));
const json = renderJsonSchema(selectModel(models, 'UserDto'));
```
