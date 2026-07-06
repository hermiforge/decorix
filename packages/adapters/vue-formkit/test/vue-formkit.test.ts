import {describe, expect, it} from 'vitest';
import {
    createAsyncConstraint,
    dateField,
    defineAsyncConstraint,
    defineConstraint,
    Email,
    EqualsField,
    Integer,
    Label,
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
import {toFormKit, useFormKitDecorix} from '../src/index';

/** Reusable custom sync constraint for the builder/decorator symmetry tests. */
const FormkitStartsWithA = defineConstraint<string, undefined>({
    name: 'formkitStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Reusable custom async constraint exercised in decorator mode. */
const FormkitAsyncDeco = defineAsyncConstraint<string, undefined>({
    name: 'formkitAsyncDeco',
    validate: async (value) => value !== 'taken',
    message: 'Already taken'
});

describe('@decorix/vue-formkit', () => {
    it('creates FormKit schema from decorators with core runtime validation', () => {
        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            @Label('Name')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const config = toFormKit(SignupDto);

        expect(config.validate?.({name: 'A', email: 'bad'})).toMatchObject({success: false});
        expect(config.schema[0]).toMatchObject({
            $formkit: 'text',
            name: 'name',
            label: 'Name',
            validation: 'required|minLength:2'
        });
    });

    it('creates FormKit schema from builder metadata and can attach Zod validation', () => {
        registerZodValidator({name: 'zod-formkit-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const config = useFormKitDecorix(user);

        expect(config.schema[1]?.validation).toBe('required|email');
        expect(config.validate?.({name: 'A', email: 'bad'})).toMatchObject({success: false});
    });

    it('uses core validation for constraints FormKit strings cannot express natively', () => {
        const article = model('FormKitFallbackDto', {
            slug: stringField().required().slug('Invalid slug')
        });

        const config = toFormKit(article);

        expect(config.validate?.({slug: 'Bad Slug'})).toMatchObject({success: false, issues: [{message: 'Invalid slug'}]});
    });

    it('snapshots FormKit validation strings', () => {
        const metadata = model('FormKitValidationSnapshotDto', {
            title: stringField().required().minLength(3).maxLength(20),
            email: stringField().email().optional(),
            age: numberField().min(18).max(65).optional()
        });

        const config = toFormKit(metadata);

        expect(config.schema.map((field) => ({
            formkit: field.$formkit,
            name: field.name,
            validation: field.validation
        }))).toMatchInlineSnapshot(`
[
  {
    "formkit": "text",
    "name": "title",
    "validation": "required|minLength:3|maxLength:20",
  },
  {
    "formkit": "text",
    "name": "email",
    "validation": "email|optional",
  },
  {
    "formkit": "number",
    "name": "age",
    "validation": "min:18|max:65|optional",
  },
]
`);
    });

    it('enforces V2 cross-field constraints through core validation', () => {
        const metadata = model('FormKitV2Dto', {
            password: stringField().required(),
            confirmPassword: stringField().equalsField('password', 'Passwords must match')
        });

        expect(toFormKit(metadata).validate?.({password: 'a', confirmPassword: 'b'})).toMatchObject({
            success: false,
            issues: [{path: ['confirmPassword'], message: 'Passwords must match'}]
        });
    });

    it('resolves async constraints through validateAsync', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'formkitAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Already taken'
        });
        const metadata = model('FormKitAsyncDto', {
            username: stringField().required().constraint('formkitAsyncAvailable')
        });

        const config = toFormKit(metadata);
        await expect(config.validateAsync?.({username: 'free'})).resolves.toMatchObject({success: true});
        await expect(config.validateAsync?.({username: 'taken'})).resolves.toMatchObject({
            success: false,
            issues: [{message: 'Already taken'}]
        });
    });

    it('enforces a custom sync constraint in builder and decorator mode', () => {
        const builder = model('FormKitCustomSyncBuilderDto', {
            code: stringField().required().constraint(FormkitStartsWithA)
        });
        expect(toFormKit(builder).validate?.({code: 'Bravo'})).toMatchObject({
            success: false,
            issues: [{path: ['code'], message: 'Must start with A'}]
        });
        expect(toFormKit(builder).validate?.({code: 'Alpha'})).toMatchObject({success: true});

        @Model('FormKitCustomSyncClassDto')
        class FormKitCustomSyncClassDto {
            @Required()
            @FormkitStartsWithA()
            code!: string;
        }
        expect(toFormKit(FormKitCustomSyncClassDto).validate?.({code: 'Bravo'})).toMatchObject({
            success: false,
            issues: [{path: ['code'], message: 'Must start with A'}]
        });
        expect(toFormKit(FormKitCustomSyncClassDto).validate?.({code: 'Alpha'})).toMatchObject({success: true});
    });

    it('resolves a custom async constraint declared in decorator mode', async () => {
        @Model('FormKitAsyncClassDto')
        class FormKitAsyncClassDto {
            @Required()
            @FormkitAsyncDeco()
            username!: string;
        }

        const config = toFormKit(FormKitAsyncClassDto);
        await expect(config.validateAsync?.({username: 'free'})).resolves.toMatchObject({success: true});
        await expect(config.validateAsync?.({username: 'taken'})).resolves.toMatchObject({
            success: false,
            issues: [{message: 'Already taken'}]
        });
    });

    it('enforces a cross-field constraint declared in decorator mode', () => {
        @Model('FormKitCrossFieldClassDto')
        class FormKitCrossFieldClassDto {
            @Required()
            password!: string;

            @EqualsField('password', 'Passwords must match')
            confirmPassword?: string;
        }

        expect(toFormKit(FormKitCrossFieldClassDto).validate?.({password: 'a', confirmPassword: 'b'})).toMatchObject({
            success: false,
            issues: [{path: ['confirmPassword'], message: 'Passwords must match'}]
        });
    });

    it('enforces native number and date constraints in builder and decorator mode', () => {
        const past = new Date('2000-01-01');
        const future = new Date(Date.now() + 86_400_000);

        const builder = model('FormKitNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past()
        });
        expect(toFormKit(builder).validate?.({age: 30, createdAt: past})).toMatchObject({success: true});
        expect(toFormKit(builder).validate?.({age: 10, createdAt: past})).toMatchObject({success: false});
        expect(toFormKit(builder).validate?.({age: 30.5, createdAt: past})).toMatchObject({success: false});
        expect(toFormKit(builder).validate?.({age: 30, createdAt: future})).toMatchObject({success: false});

        @Model('FormKitNativeClassDto')
        class FormKitNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        expect(toFormKit(FormKitNativeClassDto).validate?.({age: 30, createdAt: past})).toMatchObject({success: true});
        expect(toFormKit(FormKitNativeClassDto).validate?.({age: 10, createdAt: past})).toMatchObject({success: false});
        expect(toFormKit(FormKitNativeClassDto).validate?.({age: 30, createdAt: future})).toMatchObject({success: false});
    });});




