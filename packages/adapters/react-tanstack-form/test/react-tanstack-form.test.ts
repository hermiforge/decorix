import {describe, expect, it} from 'vitest';
import {
    createAsyncConstraint,
    dateField,
    defineAsyncConstraint,
    defineConstraint,
    Email,
    EqualsField,
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
import {toTanStackForm, useTanStackDecorix} from '../src/index';

/** Reusable custom sync constraint for the builder/decorator symmetry tests. */
const TanstackStartsWithA = defineConstraint<string, undefined>({
    name: 'tanstackStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Reusable custom async constraint exercised in decorator mode. */
const TanstackAsyncDeco = defineAsyncConstraint<string, undefined>({
    name: 'tanstackAsyncDeco',
    validate: async (value) => value !== 'taken',
    message: 'Already taken'
});

describe('@hermiforge-decorix/react-tanstack-form', () => {
    it('creates TanStack Form config from decorators', () => {
        registerZodValidator({name: 'zod-tanstack-class'});

        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const config = toTanStackForm(SignupDto, {defaultValues: {name: 'Ada'}});

        expect(config.defaultValues.name).toBe('Ada');
        // TanStack Form calls onSubmit with a context object ({value, ...}), not raw values.
        expect(config.validators.onSubmit({value: {name: 'A', email: 'bad'}})).toEqual({
            fields: {name: 'Name too short', email: 'Invalid email'}
        });
    });

    it('creates TanStack Form config from builder metadata', () => {
        registerZodValidator({name: 'zod-tanstack-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const config = useTanStackDecorix(user);

        expect(config.validators.onSubmit({value: {name: 'Ada', email: 'ada@example.com'}})).toBeUndefined();
    });

    it('throws when no validator can be resolved', () => {
        const user = model('SignupDto', {
            name: stringField().required()
        });

        expect(() => toTanStackForm(user, {validator: 'missing-tanstack-validator'})).toThrow(
            'No Decorix validator adapter registered'
        );
    });

    it('uses core validation for constraints TanStack Form cannot express natively', () => {
        const article = model('TanStackFallbackDto', {
            slug: stringField().required().slug('Invalid slug')
        });

        const config = toTanStackForm(article);

        expect(config.validators.onSubmit({value: {slug: 'Bad Slug'}})).toEqual({fields: {slug: 'Invalid slug'}});
    });

    it('enforces V2 cross-field constraints through core validation', () => {
        const metadata = model('TanStackV2Dto', {
            password: stringField().required(),
            confirmPassword: stringField().equalsField('password', 'Passwords must match')
        });

        expect(toTanStackForm(metadata).validators.onSubmit({value: {password: 'a', confirmPassword: 'b'}})).toEqual({
            fields: {confirmPassword: 'Passwords must match'}
        });
    });

    it('resolves async constraints through onSubmitAsync', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'tanstackAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Already taken'
        });
        const metadata = model('TanStackAsyncDto', {
            username: stringField().required().constraint('tanstackAsyncAvailable')
        });

        const config = toTanStackForm(metadata);
        await expect(config.validators.onSubmitAsync({value: {username: 'free'}})).resolves.toBeUndefined();
        await expect(config.validators.onSubmitAsync({value: {username: 'taken'}})).resolves.toEqual({
            fields: {username: 'Already taken'}
        });
    });

    it('enforces a custom sync constraint in builder and decorator mode', () => {
        registerZodValidator({name: 'zod-tanstack-custom-sync'});

        const builder = model('TanStackCustomSyncBuilderDto', {
            code: stringField().required().constraint(TanstackStartsWithA)
        });
        expect(toTanStackForm(builder).validators.onSubmit({value: {code: 'Bravo'}})).toEqual({
            fields: {code: 'Must start with A'}
        });
        expect(toTanStackForm(builder).validators.onSubmit({value: {code: 'Alpha'}})).toBeUndefined();

        @Model('TanStackCustomSyncClassDto')
        class TanStackCustomSyncClassDto {
            @Required()
            @TanstackStartsWithA()
            code!: string;
        }
        expect(toTanStackForm(TanStackCustomSyncClassDto).validators.onSubmit({value: {code: 'Bravo'}})).toEqual({
            fields: {code: 'Must start with A'}
        });
        expect(toTanStackForm(TanStackCustomSyncClassDto).validators.onSubmit({value: {code: 'Alpha'}})).toBeUndefined();
    });

    it('resolves a custom async constraint declared in decorator mode', async () => {
        registerZodValidator({name: 'zod-tanstack-async-class'});

        @Model('TanStackAsyncClassDto')
        class TanStackAsyncClassDto {
            @Required()
            @TanstackAsyncDeco()
            username!: string;
        }

        const config = toTanStackForm(TanStackAsyncClassDto);
        await expect(config.validators.onSubmitAsync({value: {username: 'free'}})).resolves.toBeUndefined();
        await expect(config.validators.onSubmitAsync({value: {username: 'taken'}})).resolves.toEqual({
            fields: {username: 'Already taken'}
        });
    });

    it('enforces a cross-field constraint declared in decorator mode', () => {
        registerZodValidator({name: 'zod-tanstack-crossfield-class'});

        @Model('TanStackCrossFieldClassDto')
        class TanStackCrossFieldClassDto {
            @Required()
            password!: string;

            @EqualsField('password', 'Passwords must match')
            confirmPassword?: string;
        }

        expect(
            toTanStackForm(TanStackCrossFieldClassDto).validators.onSubmit({value: {password: 'a', confirmPassword: 'b'}})
        ).toEqual({fields: {confirmPassword: 'Passwords must match'}});
    });

    it('enforces native number and date constraints in builder and decorator mode', () => {
        registerZodValidator({name: 'zod-tanstack-natives'});
        const past = new Date('2000-01-01');
        const future = new Date(Date.now() + 86_400_000);

        const builder = model('TanStackNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past()
        });
        expect(toTanStackForm(builder).validators.onSubmit({value: {age: 30, createdAt: past}})).toBeUndefined();
        expect(toTanStackForm(builder).validators.onSubmit({value: {age: 10, createdAt: past}})).toMatchObject({
            fields: {age: expect.any(String)}
        });
        expect(toTanStackForm(builder).validators.onSubmit({value: {age: 30.5, createdAt: past}})).toMatchObject({
            fields: {age: expect.any(String)}
        });
        expect(toTanStackForm(builder).validators.onSubmit({value: {age: 30, createdAt: future}})).toMatchObject({
            fields: {createdAt: expect.any(String)}
        });

        @Model('TanStackNativeClassDto')
        class TanStackNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        expect(toTanStackForm(TanStackNativeClassDto).validators.onSubmit({value: {age: 30, createdAt: past}})).toBeUndefined();
        expect(toTanStackForm(TanStackNativeClassDto).validators.onSubmit({value: {age: 10, createdAt: past}})).toMatchObject({
            fields: {age: expect.any(String)}
        });
        expect(
            toTanStackForm(TanStackNativeClassDto).validators.onSubmit({value: {age: 30, createdAt: future}})
        ).toMatchObject({fields: {createdAt: expect.any(String)}});
    });
});
