import {describe, expect, it} from 'vitest';
import {Email, Model, model, Required, stringField} from '@decorix/core';
import {
    discoverModels,
    renderAngularValidatorsModule,
    renderJsonSchema,
    renderScan,
    renderZodModule,
    selectModel
} from '../src/index';

@Model('CliUserDto')
class CliUserDto {
    @Required('Name is required')
    name!: string;

    @Required()
    @Email()
    email!: string;
}

const BuilderDto = model('CliBuilderDto', {
    title: stringField().required().minLength(2)
});

const moduleExports = {CliUserDto, BuilderDto, notAModel: 42};

describe('@decorix/cli', () => {
    it('discovers decorator classes and builder metadata, ignoring non-models', () => {
        const models = discoverModels(moduleExports);
        expect(models.map((discovered) => [discovered.name, discovered.exportName])).toEqual([
            ['CliUserDto', 'CliUserDto'],
            ['CliBuilderDto', 'BuilderDto']
        ]);
    });

    it('selects a model by name or export, and reports ambiguity', () => {
        const models = discoverModels(moduleExports);
        expect(selectModel(models, 'CliUserDto').name).toBe('CliUserDto');
        expect(selectModel(models, 'BuilderDto').name).toBe('CliBuilderDto');
        expect(() => selectModel(models)).toThrow('Multiple models found');
        expect(() => selectModel(models, 'Missing')).toThrow('No Decorix model named "Missing"');
    });

    it('renders a scan summary with field types and constraints', () => {
        const summary = renderScan(discoverModels({CliUserDto}));
        expect(summary).toContain('CliUserDto (export CliUserDto)');
        expect(summary).toContain('name: string [required]');
        expect(summary).toContain('email: string [email, required]');
    });

    it('renders JSON Schema for a selected model', () => {
        const model = selectModel(discoverModels({CliUserDto}), 'CliUserDto');
        const artifact = JSON.parse(renderJsonSchema(model));
        expect(artifact).toMatchObject({
            title: 'CliUserDto',
            type: 'object',
            required: ['name', 'email'],
            properties: {email: {type: 'string', format: 'email'}}
        });
    });

    it('renders thin Zod and Angular re-export modules referencing the entry', () => {
        const model = selectModel(discoverModels({CliUserDto}), 'CliUserDto');
        expect(renderZodModule('./dtos/user.ts', model)).toBe(
            [
                `import {toZod} from '@decorix/zod';`,
                `import {CliUserDto} from './dtos/user';`,
                ``,
                `export const CliUserDtoSchema = toZod(CliUserDto);`,
                ``
            ].join('\n')
        );
        expect(renderAngularValidatorsModule('dtos/user.ts', model)).toContain(
            `import {CliUserDto} from './dtos/user';`
        );
        expect(renderAngularValidatorsModule('dtos/user.ts', model)).toContain(
            `export const CliUserDtoFormConfig = toReactiveFormConfig(CliUserDto);`
        );
    });
});
