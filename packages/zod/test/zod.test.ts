import {describe, expect, it} from 'vitest';
import {
    arrayField,
    Constraint,
    createAsyncConstraint,
    dateField,
    defineConstraint,
    Email,
    getModelMetadata,
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
} from '@decorix/core';
import {createZodValidatorAdapter, registerZodValidator, toZod} from '../src/index';

/** Reusable custom sync constraint registered once for the decorator/builder symmetry tests. */
const startsWithA = defineConstraint<string, undefined>({
    name: 'zodStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Custom constraint carrying an options payload, to assert params flow through the Zod issue shape. */
defineConstraint<string, {prefix: string}>({
    name: 'zodHasPrefix',
    validate: (value, options) => typeof value === 'string' && value.startsWith(options.prefix),
    message: (options) => `Must start with "${options.prefix}"`
});

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

    it('enforces a custom sync constraint in builder and decorator mode', () => {
        // Builder mode: reference the registered constraint by name.
        const builder = model('ZodCustomSyncBuilderDto', {
            code: stringField().required().constraint('zodStartsWithA')
        });
        expect(toZod(builder).safeParse({code: 'Bravo'}).success).toBe(false);
        expect(toZod(builder).safeParse({code: 'Alpha'}).success).toBe(true);

        // Decorator mode: the ReusableConstraint decorator attaches the same constraint.
        @Model('ZodCustomSyncClassDto')
        class ZodCustomSyncClassDto {
            @Required()
            @startsWithA.decorator()
            code!: string;
        }

        const schema = createZodValidatorAdapter({name: 'zod-custom-sync-class'}).createSchema(getModelMetadata(ZodCustomSyncClassDto));
        expect(schema.validate({code: 'Bravo'})).toMatchObject({
            success: false,
            issues: [{constraint: 'zodStartsWithA', message: 'Must start with A'}]
        });
        expect(schema.validate({code: 'Alpha'}).success).toBe(true);
    });

    it('threads a custom options payload into issue params in builder and decorator mode', () => {
        const builder = model('ZodParamsBuilderDto', {
            code: stringField().required().constraint('zodHasPrefix', {prefix: 'A'})
        });
        const builderResult = createZodValidatorAdapter({name: 'zod-params-builder'}).createSchema(builder).validate({code: 'Bravo'});
        expect(builderResult).toMatchObject({
            success: false,
            issues: [{constraint: 'zodHasPrefix', message: 'Must start with "A"', params: {prefix: 'A'}}]
        });

        @Model('ZodParamsClassDto')
        class ZodParamsClassDto {
            @Required()
            @Constraint('zodHasPrefix', {prefix: 'A'})
            code!: string;
        }
        const classResult = createZodValidatorAdapter({name: 'zod-params-class'}).createSchema(getModelMetadata(ZodParamsClassDto)).validate({code: 'Zulu'});
        expect(classResult).toMatchObject({
            success: false,
            issues: [{constraint: 'zodHasPrefix', params: {prefix: 'A'}}]
        });
    });

    it('enforces native number, date, and array constraints in builder and decorator mode', () => {
        const builder = model('ZodNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past(),
            tags: arrayField(stringField()).minItems(2).uniqueItems()
        });
        const builderSchema = toZod(builder);
        expect(builderSchema.safeParse({age: 30, createdAt: new Date('2000-01-01'), tags: ['a', 'b']}).success).toBe(true);
        expect(builderSchema.safeParse({age: 10, createdAt: new Date('2000-01-01'), tags: ['a', 'b']}).success).toBe(false);
        expect(builderSchema.safeParse({age: 30.5, createdAt: new Date('2000-01-01'), tags: ['a', 'b']}).success).toBe(false);
        expect(builderSchema.safeParse({age: 30, createdAt: new Date(Date.now() + 86_400_000), tags: ['a', 'b']}).success).toBe(false);
        expect(builderSchema.safeParse({age: 30, createdAt: new Date('2000-01-01'), tags: ['a']}).success).toBe(false);
        expect(builderSchema.safeParse({age: 30, createdAt: new Date('2000-01-01'), tags: ['a', 'a']}).success).toBe(false);

        // Decorator mode: array element types are unknown to decorators, so exercise number + date here.
        @Model('ZodNativeClassDto')
        class ZodNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        const classSchema = createZodValidatorAdapter({name: 'zod-native-class'}).createSchema(getModelMetadata(ZodNativeClassDto));
        expect(classSchema.validate({age: 30, createdAt: new Date('2000-01-01')}).success).toBe(true);
        expect(classSchema.validate({age: 10, createdAt: new Date('2000-01-01')}).success).toBe(false);
        expect(classSchema.validate({age: 30.5, createdAt: new Date('2000-01-01')}).success).toBe(false);
        expect(classSchema.validate({age: 30, createdAt: new Date(Date.now() + 86_400_000)}).success).toBe(false);
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



