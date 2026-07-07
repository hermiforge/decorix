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
    objectField,
    Past,
    Required,
    stringField
} from '@hermiforge-decorix/core';
import {registerZodValidator} from '@hermiforge-decorix/zod';
import {toModularForm, useModularFormDecorix} from '../src/index';

/** Reusable custom sync constraint for the builder/decorator symmetry tests. */
const ModularStartsWithA = defineConstraint<string, undefined>({
    name: 'modularStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Reusable custom async constraint exercised in decorator mode. */
const ModularAsyncDeco = defineAsyncConstraint<string, undefined>({
    name: 'modularAsyncDeco',
    validate: async (value) => value !== 'taken',
    message: 'Already taken'
});

describe('@hermiforge-decorix/solid-modular-forms', () => {
    it('creates a Modular Forms config from decorators', () => {
        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const config = toModularForm(SignupDto);

        expect(config.validate({name: 'A', email: 'bad'})).toEqual({
            name: 'Name too short',
            email: 'Invalid email'
        });
        expect(config.validate({name: 'Ada', email: 'ada@example.com'})).toEqual({});
    });

    it('creates a Modular Forms config from builder metadata and can attach Zod validation', () => {
        registerZodValidator({name: 'zod-solid-modular-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const config = useModularFormDecorix(user);

        expect(config.validate({name: 'A', email: 'bad'})).toEqual({
            name: 'Name too short',
            email: 'Invalid email'
        });
    });

    it('keys errors by the full dot-path, not just the first path segment', () => {
        const metadata = model('NestedModularDto', {
            address: objectField({
                city: stringField().required('City required')
            })
        });

        const errors = toModularForm(metadata).validate({address: {}});
        expect(errors['address.city']).toBe('City required');
    });

    it('enforces V2 cross-field constraints through core validation', () => {
        const metadata = model('ModularV2Dto', {
            password: stringField().required(),
            confirmPassword: stringField().equalsField('password', 'Passwords must match')
        });

        expect(toModularForm(metadata).validate({password: 'a', confirmPassword: 'b'})).toEqual({
            confirmPassword: 'Passwords must match'
        });
    });

    it('resolves async constraints through validateAsync', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'modularAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Already taken'
        });
        const metadata = model('ModularAsyncDto', {
            username: stringField().required().constraint('modularAsyncAvailable')
        });

        const config = toModularForm(metadata);
        await expect(config.validateAsync({username: 'free'})).resolves.toEqual({});
        await expect(config.validateAsync({username: 'taken'})).resolves.toEqual({username: 'Already taken'});
    });

    it('enforces a custom sync constraint in builder and decorator mode', () => {
        const builder = model('ModularCustomSyncBuilderDto', {
            code: stringField().required().constraint(ModularStartsWithA)
        });
        expect(toModularForm(builder).validate({code: 'Bravo'})).toEqual({code: 'Must start with A'});
        expect(toModularForm(builder).validate({code: 'Alpha'})).toEqual({});

        @Model('ModularCustomSyncClassDto')
        class ModularCustomSyncClassDto {
            @Required()
            @ModularStartsWithA()
            code!: string;
        }
        expect(toModularForm(ModularCustomSyncClassDto).validate({code: 'Bravo'})).toEqual({code: 'Must start with A'});
    });

    it('resolves a custom async constraint declared in decorator mode', async () => {
        @Model('ModularAsyncClassDto')
        class ModularAsyncClassDto {
            @Required()
            @ModularAsyncDeco()
            username!: string;
        }

        const config = toModularForm(ModularAsyncClassDto);
        await expect(config.validateAsync({username: 'free'})).resolves.toEqual({});
        await expect(config.validateAsync({username: 'taken'})).resolves.toEqual({username: 'Already taken'});
    });

    it('enforces native number and date constraints in builder and decorator mode', () => {
        const past = new Date('2000-01-01');
        const future = new Date(Date.now() + 86_400_000);

        const builder = model('ModularNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past()
        });
        expect(toModularForm(builder).validate({age: 30, createdAt: past})).toEqual({});
        expect(toModularForm(builder).validate({age: 10, createdAt: past})).not.toEqual({});
        expect(toModularForm(builder).validate({age: 30, createdAt: future})).not.toEqual({});

        @Model('ModularNativeClassDto')
        class ModularNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        expect(toModularForm(ModularNativeClassDto).validate({age: 30, createdAt: past})).toEqual({});
    });

    // `@modular-forms/solid`'s `createForm` calls a client-only Solid API at
    // import/call time (confirmed by actually trying it here: it throws
    // "Client-only API called on the server side" under plain Node, unlike
    // `@felte/solid`'s `createForm`) — it requires a DOM (jsdom) or an actual
    // browser, disproportionate to add for this adapter alone. This adapter's
    // contract (`validate`/`validateAsync` returning Modular Forms' own
    // `FormErrors`/`ValidateForm` shape) was instead verified against the
    // real, installed `@modular-forms/solid` package's `.d.ts` declarations
    // (`FormErrors<TFieldValues>`, `ValidateForm`, `zodForm`'s own return
    // type) rather than only Context7 docs or a live call.
});
