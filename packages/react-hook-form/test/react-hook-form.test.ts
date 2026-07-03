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
} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toReactHookForm, useReactHookDecorix} from '../src/index';

/** Reusable custom sync constraint for the builder/decorator symmetry tests. */
const rhfStartsWithA = defineConstraint<string, undefined>({
    name: 'rhfStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Reusable custom async constraint exercised in decorator mode. */
const rhfAsyncDeco = defineAsyncConstraint<string, undefined>({
    name: 'rhfAsyncDeco',
    validate: async (value) => value !== 'taken',
    message: 'Already taken'
});

describe('@decorix/react-hook-form', () => {
    it('creates React Hook Form config from decorators', async () => {
        registerZodValidator({name: 'zod-react-hook-class'});

        @Model('SignupDto')
        class SignupDto {
            @Required('Name required')
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const config = toReactHookForm(SignupDto, {defaultValues: {name: 'Ada'}});
        const result = await config.resolver({name: 'A', email: 'bad'});

        expect(config.fields[0]?.required).toBe('Name required');
        expect(result.errors).toMatchObject({
            name: {message: 'Name too short'},
            email: {message: 'Invalid email'}
        });
    });

    it('creates React Hook Form config from builder metadata', async () => {
        registerZodValidator({name: 'zod-react-hook-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const config = useReactHookDecorix(user, {defaultValues: {name: 'Ada', email: 'ada@example.com'}});
        const result = await config.resolver({name: 'Ada', email: 'ada@example.com'});

        expect(result).toMatchObject({errors: {}});
    });

    it('throws when no validator can be resolved', () => {
        const user = model('SignupDto', {
            name: stringField().required()
        });

        expect(() => toReactHookForm(user, {validator: 'missing-react-hook-validator'})).toThrow(
            'No Decorix validator adapter registered'
        );
    });

    it('uses core validation for constraints React Hook Form rules cannot express natively', async () => {
        const article = model('HookFormFallbackDto', {
            slug: stringField().required().slug('Invalid slug')
        });

        const config = toReactHookForm(article);
        const result = await config.resolver({slug: 'Bad Slug'});

        expect(result.errors).toMatchObject({slug: {message: 'Invalid slug'}});
    });

    it('snapshots core resolver error shape', async () => {
        const metadata = model('HookResolverSnapshotDto', {
            name: stringField().required('Name required').minLength(2, 'Name too short'),
            email: stringField().email('Invalid email').optional(),
            age: numberField().min(18, 'Too young').optional()
        });

        const config = toReactHookForm(metadata);
        const result = await config.resolver({name: 'A', email: 'bad', age: 16});

        expect(result).toMatchInlineSnapshot(`
{
  "errors": {
    "age": {
      "message": "Too young",
      "type": "decorix.min",
    },
    "email": {
      "message": "Invalid email",
      "type": "decorix.email",
    },
    "name": {
      "message": "Name too short",
      "type": "decorix.minLength",
    },
  },
  "values": {},
}
`);
    });

    it('enforces V2 cross-field constraints through core validation', async () => {
        const metadata = model('HookV2Dto', {
            password: stringField().required(),
            confirmPassword: stringField().equalsField('password', 'Passwords must match')
        });

        const result = await toReactHookForm(metadata).resolver({password: 'a', confirmPassword: 'b'});

        expect(result.errors).toMatchObject({confirmPassword: {message: 'Passwords must match'}});
    });

    it('resolves async constraints through the async resolver', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'hookAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Already taken'
        });
        const metadata = model('HookAsyncDto', {
            username: stringField().required().constraint('hookAsyncAvailable')
        });

        const config = toReactHookForm(metadata);
        expect((await config.resolver({username: 'free'})).errors).toMatchObject({});
        expect((await config.resolver({username: 'taken'})).errors).toMatchObject({username: {message: 'Already taken'}});
    });

    it('enforces a custom sync constraint in builder and decorator mode', async () => {
        registerZodValidator({name: 'zod-react-hook-custom-sync'});

        const builder = model('HookCustomSyncBuilderDto', {
            code: stringField().required().constraint('rhfStartsWithA')
        });
        expect((await toReactHookForm(builder).resolver({code: 'Bravo'})).errors).toMatchObject({code: {message: 'Must start with A'}});
        expect((await toReactHookForm(builder).resolver({code: 'Alpha'})).errors).toMatchObject({});

        @Model('HookCustomSyncClassDto')
        class HookCustomSyncClassDto {
            @Required()
            @rhfStartsWithA.decorator()
            code!: string;
        }
        expect((await toReactHookForm(HookCustomSyncClassDto).resolver({code: 'Bravo'})).errors).toMatchObject({code: {message: 'Must start with A'}});
        expect((await toReactHookForm(HookCustomSyncClassDto).resolver({code: 'Alpha'})).errors).toMatchObject({});
    });

    it('resolves a custom async constraint declared in decorator mode', async () => {
        registerZodValidator({name: 'zod-react-hook-async-class'});

        @Model('HookAsyncClassDto')
        class HookAsyncClassDto {
            @Required()
            @rhfAsyncDeco.decorator()
            username!: string;
        }

        const config = toReactHookForm(HookAsyncClassDto);
        expect((await config.resolver({username: 'free'})).errors).toMatchObject({});
        expect((await config.resolver({username: 'taken'})).errors).toMatchObject({username: {message: 'Already taken'}});
    });

    it('enforces a cross-field constraint declared in decorator mode', async () => {
        registerZodValidator({name: 'zod-react-hook-crossfield-class'});

        @Model('HookCrossFieldClassDto')
        class HookCrossFieldClassDto {
            @Required()
            password!: string;

            @EqualsField('password', 'Passwords must match')
            confirmPassword?: string;
        }

        const result = await toReactHookForm(HookCrossFieldClassDto).resolver({password: 'a', confirmPassword: 'b'});
        expect(result.errors).toMatchObject({confirmPassword: {message: 'Passwords must match'}});
    });

    it('enforces native number and date constraints in builder and decorator mode', async () => {
        registerZodValidator({name: 'zod-react-hook-natives'});
        const past = new Date('2000-01-01');
        const future = new Date(Date.now() + 86_400_000);

        const builder = model('HookNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past()
        });
        expect((await toReactHookForm(builder).resolver({age: 30, createdAt: past})).errors).toMatchObject({});
        expect((await toReactHookForm(builder).resolver({age: 10, createdAt: past})).errors).toMatchObject({age: {}});
        expect((await toReactHookForm(builder).resolver({age: 30.5, createdAt: past})).errors).toMatchObject({age: {}});
        expect((await toReactHookForm(builder).resolver({age: 30, createdAt: future})).errors).toMatchObject({createdAt: {}});

        @Model('HookNativeClassDto')
        class HookNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        expect((await toReactHookForm(HookNativeClassDto).resolver({age: 30, createdAt: past})).errors).toMatchObject({});
        expect((await toReactHookForm(HookNativeClassDto).resolver({age: 10, createdAt: past})).errors).toMatchObject({age: {}});
        expect((await toReactHookForm(HookNativeClassDto).resolver({age: 30, createdAt: future})).errors).toMatchObject({createdAt: {}});
    });});



