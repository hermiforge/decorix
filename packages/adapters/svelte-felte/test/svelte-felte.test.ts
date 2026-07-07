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
import {toFelteForm, useFelteDecorix} from '../src/index';

/** Reusable custom sync constraint for the builder/decorator symmetry tests. */
const FelteStartsWithA = defineConstraint<string, undefined>({
    name: 'felteStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Reusable custom async constraint exercised in decorator mode. */
const FelteAsyncDeco = defineAsyncConstraint<string, undefined>({
    name: 'felteAsyncDeco',
    validate: async (value) => value !== 'taken',
    message: 'Already taken'
});

describe('@hermiforge-decorix/svelte-felte', () => {
    it('creates a Felte config from decorators', () => {
        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const config = toFelteForm(SignupDto);

        expect(config.validate({name: 'A', email: 'bad'})).toEqual({
            name: ['Name too short'],
            email: ['Invalid email']
        });
        expect(config.validate({name: 'Ada', email: 'ada@example.com'})).toEqual({});
    });

    it('creates a Felte config from builder metadata and can attach Zod validation', () => {
        registerZodValidator({name: 'zod-svelte-felte-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const config = useFelteDecorix(user);

        expect(config.validate({name: 'A', email: 'bad'})).toEqual({
            name: ['Name too short'],
            email: ['Invalid email']
        });
    });

    it('keeps every issue per field, unlike single-error adapters', () => {
        const metadata = model('MultiIssueDto', {
            code: stringField().required().minLength(5).pattern(/^[A-Z]+$/)
        });

        const errors = toFelteForm(metadata).validate({code: 'ab'});
        expect(errors.code).toHaveLength(2);
    });

    it('enforces V2 cross-field constraints through core validation', () => {
        const metadata = model('FelteV2Dto', {
            password: stringField().required(),
            confirmPassword: stringField().equalsField('password', 'Passwords must match')
        });

        expect(toFelteForm(metadata).validate({password: 'a', confirmPassword: 'b'})).toEqual({
            confirmPassword: ['Passwords must match']
        });
    });

    it('resolves async constraints through validateAsync', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'felteAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Already taken'
        });
        const metadata = model('FelteAsyncDto', {
            username: stringField().required().constraint('felteAsyncAvailable')
        });

        const config = toFelteForm(metadata);
        await expect(config.validateAsync({username: 'free'})).resolves.toEqual({});
        await expect(config.validateAsync({username: 'taken'})).resolves.toEqual({username: ['Already taken']});
    });

    it('enforces a custom sync constraint in builder and decorator mode', () => {
        const builder = model('FelteCustomSyncBuilderDto', {
            code: stringField().required().constraint(FelteStartsWithA)
        });
        expect(toFelteForm(builder).validate({code: 'Bravo'})).toEqual({code: ['Must start with A']});
        expect(toFelteForm(builder).validate({code: 'Alpha'})).toEqual({});

        @Model('FelteCustomSyncClassDto')
        class FelteCustomSyncClassDto {
            @Required()
            @FelteStartsWithA()
            code!: string;
        }
        expect(toFelteForm(FelteCustomSyncClassDto).validate({code: 'Bravo'})).toEqual({code: ['Must start with A']});
    });

    it('resolves a custom async constraint declared in decorator mode', async () => {
        @Model('FelteAsyncClassDto')
        class FelteAsyncClassDto {
            @Required()
            @FelteAsyncDeco()
            username!: string;
        }

        const config = toFelteForm(FelteAsyncClassDto);
        await expect(config.validateAsync({username: 'free'})).resolves.toEqual({});
        await expect(config.validateAsync({username: 'taken'})).resolves.toEqual({username: ['Already taken']});
    });

    it('enforces native number and date constraints in builder and decorator mode', () => {
        const past = new Date('2000-01-01');
        const future = new Date(Date.now() + 86_400_000);

        const builder = model('FelteNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past()
        });
        expect(toFelteForm(builder).validate({age: 30, createdAt: past})).toEqual({});
        expect(toFelteForm(builder).validate({age: 10, createdAt: past})).not.toEqual({});
        expect(toFelteForm(builder).validate({age: 30, createdAt: future})).not.toEqual({});

        @Model('FelteNativeClassDto')
        class FelteNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        expect(toFelteForm(FelteNativeClassDto).validate({age: 30, createdAt: past})).toEqual({});
    });

    // Felte's real `createForm` calls Svelte's `onDestroy` internally, which
    // throws outside an active component instance (confirmed by actually
    // running it here) — the same constraint documented for angular-signal's
    // `form()`. This adapter is passive (it never calls `createForm` itself),
    // so its contract is verified above against Felte's real, Context7-checked
    // `ValidationFunction` shape (`(values) => errors | undefined | Promise<...>`)
    // instead of a live `createForm` instantiation.
});
