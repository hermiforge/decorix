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
import {toVeeValidate, useVeeDecorix} from '../src/index';

/** Reusable custom sync constraint for the builder/decorator symmetry tests. */
const VeeStartsWithA = defineConstraint<string, undefined>({
    name: 'veeStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Reusable custom async constraint exercised in decorator mode. */
const VeeAsyncDeco = defineAsyncConstraint<string, undefined>({
    name: 'veeAsyncDeco',
    validate: async (value) => value !== 'taken',
    message: 'Already taken'
});

describe('@hermiforge-decorix/vue-vee-validate', () => {
    it('creates VeeValidate config from decorators', () => {
        registerZodValidator({name: 'zod-vee-class'});

        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const config = toVeeValidate(SignupDto, {initialValues: {name: 'Ada'}});

        expect(config.initialValues.name).toBe('Ada');
        expect(config.validate({name: 'A', email: 'bad'})).toMatchObject({success: false});
    });

    it('creates VeeValidate config from builder metadata', () => {
        registerZodValidator({name: 'zod-vee-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const config = useVeeDecorix(user);

        expect(config.validationSchema.validate({name: 'Ada', email: 'ada@example.com'})).toMatchObject({success: true});
    });

    it('throws when no validator can be resolved', () => {
        const user = model('SignupDto', {
            name: stringField().required()
        });

        expect(() => toVeeValidate(user, {validator: 'missing-vee-validator'})).toThrow(
            'No Decorix validator adapter registered'
        );
    });

    it('uses core validation for constraints VeeValidate descriptors cannot express natively', () => {
        const article = model('VeeFallbackDto', {
            slug: stringField().required().slug('Invalid slug')
        });

        const config = toVeeValidate(article);

        expect(config.validate({slug: 'Bad Slug'})).toMatchObject({success: false, issues: [{message: 'Invalid slug'}]});
    });

    it('enforces V2 cross-field constraints through core validation', () => {
        const metadata = model('VeeV2Dto', {
            password: stringField().required(),
            confirmPassword: stringField().equalsField('password', 'Passwords must match')
        });

        expect(toVeeValidate(metadata).validate({password: 'a', confirmPassword: 'b'})).toMatchObject({
            success: false,
            issues: [{path: ['confirmPassword'], message: 'Passwords must match'}]
        });
    });

    it('resolves async constraints through validateAsync', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'veeAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Already taken'
        });
        const metadata = model('VeeAsyncDto', {
            username: stringField().required().constraint('veeAsyncAvailable')
        });

        const config = toVeeValidate(metadata);
        await expect(config.validateAsync({username: 'free'})).resolves.toMatchObject({success: true});
        await expect(config.validateAsync({username: 'taken'})).resolves.toMatchObject({
            success: false,
            issues: [{message: 'Already taken'}]
        });
    });

    it('enforces a custom sync constraint in builder and decorator mode', () => {
        registerZodValidator({name: 'zod-vee-custom-sync'});

        const builder = model('VeeCustomSyncBuilderDto', {
            code: stringField().required().constraint(VeeStartsWithA)
        });
        expect(toVeeValidate(builder).validate({code: 'Bravo'})).toMatchObject({
            success: false,
            issues: [{path: ['code'], message: 'Must start with A'}]
        });
        expect(toVeeValidate(builder).validate({code: 'Alpha'})).toMatchObject({success: true});

        @Model('VeeCustomSyncClassDto')
        class VeeCustomSyncClassDto {
            @Required()
            @VeeStartsWithA()
            code!: string;
        }
        expect(toVeeValidate(VeeCustomSyncClassDto).validate({code: 'Bravo'})).toMatchObject({
            success: false,
            issues: [{path: ['code'], message: 'Must start with A'}]
        });
        expect(toVeeValidate(VeeCustomSyncClassDto).validate({code: 'Alpha'})).toMatchObject({success: true});
    });

    it('resolves a custom async constraint declared in decorator mode', async () => {
        registerZodValidator({name: 'zod-vee-async-class'});

        @Model('VeeAsyncClassDto')
        class VeeAsyncClassDto {
            @Required()
            @VeeAsyncDeco()
            username!: string;
        }

        const config = toVeeValidate(VeeAsyncClassDto);
        await expect(config.validateAsync({username: 'free'})).resolves.toMatchObject({success: true});
        await expect(config.validateAsync({username: 'taken'})).resolves.toMatchObject({
            success: false,
            issues: [{message: 'Already taken'}]
        });
    });

    it('enforces a cross-field constraint declared in decorator mode', () => {
        registerZodValidator({name: 'zod-vee-crossfield-class'});

        @Model('VeeCrossFieldClassDto')
        class VeeCrossFieldClassDto {
            @Required()
            password!: string;

            @EqualsField('password', 'Passwords must match')
            confirmPassword?: string;
        }

        expect(toVeeValidate(VeeCrossFieldClassDto).validate({password: 'a', confirmPassword: 'b'})).toMatchObject({
            success: false,
            issues: [{path: ['confirmPassword'], message: 'Passwords must match'}]
        });
    });

    it('enforces native number and date constraints in builder and decorator mode', () => {
        registerZodValidator({name: 'zod-vee-natives'});
        const past = new Date('2000-01-01');
        const future = new Date(Date.now() + 86_400_000);

        const builder = model('VeeNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past()
        });
        expect(toVeeValidate(builder).validate({age: 30, createdAt: past})).toMatchObject({success: true});
        expect(toVeeValidate(builder).validate({age: 10, createdAt: past})).toMatchObject({success: false});
        expect(toVeeValidate(builder).validate({age: 30.5, createdAt: past})).toMatchObject({success: false});
        expect(toVeeValidate(builder).validate({age: 30, createdAt: future})).toMatchObject({success: false});

        @Model('VeeNativeClassDto')
        class VeeNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        expect(toVeeValidate(VeeNativeClassDto).validate({age: 30, createdAt: past})).toMatchObject({success: true});
        expect(toVeeValidate(VeeNativeClassDto).validate({age: 10, createdAt: past})).toMatchObject({success: false});
        expect(toVeeValidate(VeeNativeClassDto).validate({age: 30, createdAt: future})).toMatchObject({success: false});
    });});



