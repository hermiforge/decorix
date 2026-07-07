import {describe, expect, it} from 'vitest';
import {
    createAsyncConstraint,
    dateField,
    defineAsyncConstraint,
    defineConstraint,
    Email,
    Integer,
    Max,
    Min,
    MinLength,
    Model,
    model,
    numberField,
    Past,
    Required,
    stringField
} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {superValidate} from 'sveltekit-superforms/server';
import {createSuperformsValidatorAdapter} from '../src/index';

/** Reusable custom sync constraint for the builder/decorator symmetry tests. */
const SuperformsStartsWithA = defineConstraint<string, undefined>({
    name: 'superformsStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Reusable custom async constraint exercised in decorator mode. */
const SuperformsAsyncDeco = defineAsyncConstraint<string, undefined>({
    name: 'superformsAsyncDeco',
    validate: async (value) => value !== 'taken',
    message: 'Already taken'
});

describe('@hermiforge-decorix/svelte-superforms', () => {
    it('creates a Superforms validator adapter from decorators', () => {
        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const adapter = createSuperformsValidatorAdapter(SignupDto);

        expect(adapter.superFormValidationLibrary).toBe('custom');
        expect(adapter.id).toBe('SignupDto');
        expect(adapter.defaults).toEqual({name: '', email: ''});
        expect(adapter.constraints).toEqual({
            name: {required: true, minlength: 2},
            email: {required: true}
        });
    });

    it('creates a Superforms validator adapter from builder metadata and can attach Zod validation', () => {
        registerZodValidator({name: 'zod-svelte-superforms-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const adapter = createSuperformsValidatorAdapter(user);
        expect(adapter.defaults).toEqual({name: '', email: '', age: 0});
    });

    it('produces a JSON schema through @hermiforge-decorix/json-schema', () => {
        const metadata = model('JsonSchemaDto', {
            name: stringField().required().minLength(2)
        });

        const adapter = createSuperformsValidatorAdapter(metadata);
        expect(adapter.jsonSchema).toMatchObject({
            type: 'object',
            required: ['name'],
            properties: {name: {type: 'string', minLength: 2}}
        });
    });

    it('overrides generated defaults with options.initialValues', () => {
        const metadata = model('InitialValuesDto', {
            name: stringField().required()
        });

        const adapter = createSuperformsValidatorAdapter(metadata, {initialValues: {name: 'Ada'}});
        expect(adapter.defaults).toEqual({name: 'Ada'});
    });

    it('validates through the real superValidate/superForm entrypoint', async () => {
        const metadata = model('RealSuperformsDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email')
        });

        const adapter = createSuperformsValidatorAdapter(metadata);

        const invalid = await superValidate({name: 'A', email: 'bad'}, adapter);
        expect(invalid.valid).toBe(false);
        expect(invalid.errors).toMatchObject({
            name: ['Name too short'],
            email: ['Invalid email']
        });

        const valid = await superValidate({name: 'Ada', email: 'ada@example.com'}, adapter);
        expect(valid.valid).toBe(true);
        expect(valid.data).toEqual({name: 'Ada', email: 'ada@example.com'});
    });

    it('enforces V2 cross-field constraints through core validation', async () => {
        const metadata = model('SuperformsV2Dto', {
            password: stringField().required(),
            confirmPassword: stringField().equalsField('password', 'Passwords must match')
        });

        const adapter = createSuperformsValidatorAdapter(metadata);
        const result = await superValidate({password: 'a', confirmPassword: 'b'}, adapter);

        expect(result.valid).toBe(false);
        expect(result.errors).toMatchObject({confirmPassword: ['Passwords must match']});
    });

    it('resolves async constraints through the real superValidate entrypoint', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'superformsAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Already taken'
        });
        const metadata = model('SuperformsAsyncDto', {
            username: stringField().required().constraint('superformsAsyncAvailable')
        });

        const adapter = createSuperformsValidatorAdapter(metadata);
        expect((await superValidate({username: 'free'}, adapter)).valid).toBe(true);
        const taken = await superValidate({username: 'taken'}, adapter);
        expect(taken.valid).toBe(false);
        expect(taken.errors).toMatchObject({username: ['Already taken']});
    });

    it('enforces a custom sync constraint in builder and decorator mode', async () => {
        const builder = model('SuperformsCustomSyncBuilderDto', {
            code: stringField().required().constraint(SuperformsStartsWithA)
        });
        const adapter = createSuperformsValidatorAdapter(builder);
        expect((await superValidate({code: 'Bravo'}, adapter)).errors).toMatchObject({code: ['Must start with A']});
        expect((await superValidate({code: 'Alpha'}, adapter)).valid).toBe(true);

        @Model('SuperformsCustomSyncClassDto')
        class SuperformsCustomSyncClassDto {
            @Required()
            @SuperformsStartsWithA()
            code!: string;
        }
        const classAdapter = createSuperformsValidatorAdapter(SuperformsCustomSyncClassDto);
        expect((await superValidate({code: 'Bravo'}, classAdapter)).errors).toMatchObject({code: ['Must start with A']});
    });

    it('resolves a custom async constraint declared in decorator mode', async () => {
        @Model('SuperformsAsyncClassDto')
        class SuperformsAsyncClassDto {
            @Required()
            @SuperformsAsyncDeco()
            username!: string;
        }

        const adapter = createSuperformsValidatorAdapter(SuperformsAsyncClassDto);
        expect((await superValidate({username: 'free'}, adapter)).valid).toBe(true);
        const taken = await superValidate({username: 'taken'}, adapter);
        expect(taken.errors).toMatchObject({username: ['Already taken']});
    });

    it('enforces native number and date constraints in builder and decorator mode', async () => {
        const past = new Date('2000-01-01');
        const future = new Date(Date.now() + 86_400_000);

        const builder = model('SuperformsNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past()
        });
        const adapter = createSuperformsValidatorAdapter(builder);
        expect((await superValidate({age: 30, createdAt: past}, adapter)).valid).toBe(true);
        expect((await superValidate({age: 10, createdAt: past}, adapter)).valid).toBe(false);
        expect((await superValidate({age: 30, createdAt: future}, adapter)).valid).toBe(false);

        @Model('SuperformsNativeClassDto')
        class SuperformsNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        const classAdapter = createSuperformsValidatorAdapter(SuperformsNativeClassDto);
        expect((await superValidate({age: 30, createdAt: past}, classAdapter)).valid).toBe(true);
    });
});
