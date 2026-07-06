import {Email, MinLength, Model, Required} from '@decorix/core';
import {discoverModels, renderJsonSchema, selectModel} from '@decorix/cli';

// `@decorix/cli`'s `scan`/`json-schema`/`zod`/`angular-validators` commands load
// a real file from disk and execute it to discover `@Model` classes; this
// example calls the same programmatic API directly on an in-memory module
// namespace object instead of a file, so it stays a plain, runnable script.
@Model('CliDemoDto')
class CliDemoDto {
    @Required()
    @MinLength(2)
    name!: string;

    @Required()
    @Email()
    email!: string;
}

const models = discoverModels({CliDemoDto});
console.log('discovered models:', models.map((entry) => entry.name));

const selected = selectModel(models, 'CliDemoDto');
console.log('JSON Schema:', renderJsonSchema(selected));
