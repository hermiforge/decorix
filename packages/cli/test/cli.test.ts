import {describe, expect, it} from 'vitest';
import {Email, Model, model, Required, stringField} from '@hermiforge-decorix/core';
import {
    discoverModels,
    renderAngularSignalModule,
    renderAngularValidatorsModule,
    renderJsonSchema,
    renderNestModule,
    renderReactHookFormModule,
    renderReactTanStackFormModule,
    renderScan,
    renderVueFormKitModule,
    renderVueVeeValidateModule,
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

describe('@hermiforge-decorix/cli', () => {
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
                `import {toZod} from '@hermiforge-decorix/zod';`,
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

    it('renders thin re-export modules for the remaining 6 adapters', () => {
        const model = selectModel(discoverModels({CliUserDto}), 'CliUserDto');

        expect(renderAngularSignalModule('dtos/user.ts', model)).toBe(
            [
                `import {toSignalForm} from '@hermiforge-decorix/angular-signal';`,
                `import {CliUserDto} from './dtos/user';`,
                ``,
                `export const CliUserDtoForm = toSignalForm(CliUserDto);`,
                ``
            ].join('\n')
        );

        expect(renderReactHookFormModule('dtos/user.ts', model)).toBe(
            [
                `import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';`,
                `import {CliUserDto} from './dtos/user';`,
                ``,
                `export const CliUserDtoConfig = toReactHookForm(CliUserDto);`,
                ``
            ].join('\n')
        );

        expect(renderReactTanStackFormModule('dtos/user.ts', model)).toBe(
            [
                `import {toTanStackForm} from '@hermiforge-decorix/react-tanstack-form';`,
                `import {CliUserDto} from './dtos/user';`,
                ``,
                `export const CliUserDtoConfig = toTanStackForm(CliUserDto);`,
                ``
            ].join('\n')
        );

        expect(renderVueFormKitModule('dtos/user.ts', model)).toBe(
            [
                `import {toFormKit} from '@hermiforge-decorix/vue-formkit';`,
                `import {CliUserDto} from './dtos/user';`,
                ``,
                `export const CliUserDtoConfig = toFormKit(CliUserDto);`,
                ``
            ].join('\n')
        );

        expect(renderVueVeeValidateModule('dtos/user.ts', model)).toBe(
            [
                `import {toVeeValidate} from '@hermiforge-decorix/vue-vee-validate';`,
                `import {CliUserDto} from './dtos/user';`,
                ``,
                `export const CliUserDtoConfig = toVeeValidate(CliUserDto);`,
                ``
            ].join('\n')
        );

        expect(renderNestModule('dtos/user.ts', model)).toBe(
            [
                `import {DecorixPipe} from '@hermiforge-decorix/nest';`,
                `import {CliUserDto} from './dtos/user';`,
                ``,
                `export const CliUserDtoPipe = DecorixPipe(CliUserDto);`,
                ``
            ].join('\n')
        );
    });
});
