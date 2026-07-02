import {describe, expect, it} from 'vitest';
import {createAsyncConstraint, defineConstraint, Email, getModelMetadata, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {createZodValidatorAdapter, registerZodValidator, toZod} from '../src/index';

describe('@decorix/zod', () => {
    it('validates builder-declared schemas', () => {
        const user = model('UserDto', {
            name: stringField().required('Name required').minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const schema = toZod(user);

        expect(schema.safeParse({name: 'Ada', email: 'ada@example.com', age: 37}).success).toBe(true);
        expect(schema.safeParse({name: 'A', email: 'bad', age: 12}).success).toBe(false);
    });

    it('validates decorator-declared schemas through the generic adapter', () => {
        @Model('UserDto')
        class UserDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const adapter = createZodValidatorAdapter({name: 'zod-test-direct'});
        const result = adapter.createSchema(getModelMetadata(UserDto)).validate({name: 'A', email: 'bad'});

        expect(result.success).toBe(false);
        expect(result.success ? [] : result.issues.map((issue) => issue.message)).toEqual([
            'Name too short',
            'Invalid email'
        ]);
    });

    it('registers the Zod adapter as the default validator', () => {
        const adapter = registerZodValidator({name: 'zod-test-default'});

        expect(adapter.name).toBe('zod-test-default');
    });

    it('enforces unsupported native constraints with a Zod custom fallback', () => {
        const article = model('ArticleDtoZodFallback', {
            slug: stringField().required().slug('Invalid slug')
        });

        const result = toZod(article).safeParse({slug: 'Bad Slug'});

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]).toMatchObject({message: 'Invalid slug'});
        }
    });

    it('rejects async constraints on the sync path and resolves them via validateAsync', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'zodAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Value is already taken.'
        });

        const metadata = model('ZodAsyncDto', {
            username: stringField().required().constraint('zodAsyncAvailable')
        });
        const schema = createZodValidatorAdapter({name: 'zod-test-async'}).createSchema(metadata);

        expect(() => schema.validate({username: 'free'})).toThrow('Use validateAsync instead');
        await expect(schema.validateAsync!({username: 'free'})).resolves.toMatchObject({success: true});
        await expect(schema.validateAsync!({username: 'taken'})).resolves.toMatchObject({
            success: false,
            issues: [{constraint: 'zodAsyncAvailable', message: 'Value is already taken.'}]
        });
    });

    it('forwards runtime services to custom constraints through the Zod context', async () => {
        const blocklist = defineConstraint<string, undefined>({
            name: 'zodServiceBlocklist',
            validate: (value, _options, context) => {
                const blocked = (context.services?.blocked as string[] | undefined) ?? [];
                return !blocked.includes(value);
            },
            message: 'Value is blocked.'
        });

        const metadata = model('ZodServiceDto', {
            handle: stringField().required().constraint(blocklist.name)
        });
        const schema = createZodValidatorAdapter({name: 'zod-test-services'}).createSchema(metadata);

        expect(schema.validate({handle: 'admin'}, {services: {blocked: ['admin']}})).toMatchObject({
            success: false,
            issues: [{constraint: 'zodServiceBlocklist', message: 'Value is blocked.'}]
        });
        expect(schema.validate({handle: 'admin'}).success).toBe(true);
    });
});



