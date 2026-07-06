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
import {DecorixPipe, DecorixValidationException} from '../src/index';

/** Reusable custom sync constraint for the builder/decorator symmetry tests. */
const NestStartsWithA = defineConstraint<string, undefined>({
    name: 'nestStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Reusable custom async constraint exercised in decorator mode. */
const NestAsyncDeco = defineAsyncConstraint<string, undefined>({
    name: 'nestAsyncDeco',
    validate: async (value) => value !== 'taken',
    message: 'Already taken'
});

describe('@hermiforge-decorix/nest', () => {
    it('creates a Nest-compatible pipe from decorators', () => {
        registerZodValidator({name: 'zod-nest-class'});

        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const pipe = DecorixPipe(SignupDto);

        expect(pipe.transform({name: 'Ada', email: 'ada@example.com'})).toMatchObject({name: 'Ada'});
        expect(() => pipe.transform({name: 'A', email: 'bad'})).toThrow(DecorixValidationException);
    });

    it('creates a Nest-compatible pipe from builder metadata', () => {
        registerZodValidator({name: 'zod-nest-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const pipe = DecorixPipe(user);

        try {
            pipe.transform({name: 'A', email: 'bad'});
            throw new Error('Expected validation to fail.');
        } catch (error) {
            expect(error).toBeInstanceOf(DecorixValidationException);
            expect((error as DecorixValidationException).getResponse().issues).toEqual([
                {path: ['name'], message: 'Name too short'},
                {path: ['email'], message: 'Invalid email'}
            ]);
        }
    });

    it('throws when no validator can be resolved', () => {
        const user = model('SignupDto', {
            name: stringField().required()
        });

        expect(() => DecorixPipe(user, {validator: 'missing-nest-validator'})).toThrow(
            'No Decorix validator adapter registered'
        );
    });

    it('uses core validation for constraints Nest pipes cannot express natively', () => {
        const article = model('NestFallbackDto', {
            slug: stringField().required().slug('Invalid slug')
        });

        const pipe = DecorixPipe(article);

        expect(() => pipe.transform({slug: 'Bad Slug'})).toThrow(DecorixValidationException);
    });

    it('enforces V2 cross-field constraints through core validation', () => {
        const metadata = model('NestV2Dto', {
            password: stringField().required(),
            confirmPassword: stringField().equalsField('password', 'Passwords must match')
        });

        expect(() => DecorixPipe(metadata).transform({password: 'a', confirmPassword: 'b'})).toThrow(DecorixValidationException);
    });

    it('validates async constraints through an awaited transform', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'nestAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Already taken'
        });
        const metadata = model('NestAsyncDto', {
            username: stringField().required().constraint('nestAsyncAvailable')
        });
        const pipe = DecorixPipe(metadata);

        await expect(pipe.transform({username: 'free'})).resolves.toMatchObject({username: 'free'});
        await expect(pipe.transform({username: 'taken'})).rejects.toBeInstanceOf(DecorixValidationException);
    });

    it('enforces a custom sync constraint in builder and decorator mode', () => {
        registerZodValidator({name: 'zod-nest-custom-sync'});

        const builder = model('NestCustomSyncBuilderDto', {
            code: stringField().required().constraint(NestStartsWithA)
        });
        expect(DecorixPipe(builder).transform({code: 'Alpha'})).toMatchObject({code: 'Alpha'});
        expect(() => DecorixPipe(builder).transform({code: 'Bravo'})).toThrow(DecorixValidationException);

        @Model('NestCustomSyncClassDto')
        class NestCustomSyncClassDto {
            @Required()
            @NestStartsWithA()
            code!: string;
        }
        expect(DecorixPipe(NestCustomSyncClassDto).transform({code: 'Alpha'})).toMatchObject({code: 'Alpha'});
        try {
            DecorixPipe(NestCustomSyncClassDto).transform({code: 'Bravo'});
            throw new Error('Expected validation to fail.');
        } catch (error) {
            expect(error).toBeInstanceOf(DecorixValidationException);
            expect((error as DecorixValidationException).getResponse().issues).toEqual([{path: ['code'], message: 'Must start with A'}]);
        }
    });

    it('resolves a custom async constraint declared in decorator mode', async () => {
        registerZodValidator({name: 'zod-nest-async-class'});

        @Model('NestAsyncClassDto')
        class NestAsyncClassDto {
            @Required()
            @NestAsyncDeco()
            username!: string;
        }

        const pipe = DecorixPipe(NestAsyncClassDto);
        await expect(pipe.transform({username: 'free'})).resolves.toMatchObject({username: 'free'});
        await expect(pipe.transform({username: 'taken'})).rejects.toBeInstanceOf(DecorixValidationException);
    });

    it('enforces a cross-field constraint declared in decorator mode', () => {
        registerZodValidator({name: 'zod-nest-crossfield-class'});

        @Model('NestCrossFieldClassDto')
        class NestCrossFieldClassDto {
            @Required()
            password!: string;

            @EqualsField('password', 'Passwords must match')
            confirmPassword?: string;
        }

        expect(() => DecorixPipe(NestCrossFieldClassDto).transform({password: 'a', confirmPassword: 'b'})).toThrow(DecorixValidationException);
        expect(DecorixPipe(NestCrossFieldClassDto).transform({password: 'a', confirmPassword: 'a'})).toMatchObject({password: 'a'});
    });

    it('enforces native number and date constraints in builder and decorator mode', () => {
        registerZodValidator({name: 'zod-nest-natives'});
        const past = new Date('2000-01-01');
        const future = new Date(Date.now() + 86_400_000);

        const builder = model('NestNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past()
        });
        expect(DecorixPipe(builder).transform({age: 30, createdAt: past})).toMatchObject({age: 30});
        expect(() => DecorixPipe(builder).transform({age: 10, createdAt: past})).toThrow(DecorixValidationException);
        expect(() => DecorixPipe(builder).transform({age: 30.5, createdAt: past})).toThrow(DecorixValidationException);
        expect(() => DecorixPipe(builder).transform({age: 30, createdAt: future})).toThrow(DecorixValidationException);

        @Model('NestNativeClassDto')
        class NestNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        expect(DecorixPipe(NestNativeClassDto).transform({age: 30, createdAt: past})).toMatchObject({age: 30});
        expect(() => DecorixPipe(NestNativeClassDto).transform({age: 10, createdAt: past})).toThrow(DecorixValidationException);
        expect(() => DecorixPipe(NestNativeClassDto).transform({age: 30, createdAt: future})).toThrow(DecorixValidationException);
    });});



