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
import {toSignalForm} from '../src/index';

/** Reusable custom sync constraint for the builder/decorator symmetry tests. */
const SignalStartsWithA = defineConstraint<string, undefined>({
    name: 'signalStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

/** Reusable custom async constraint exercised in decorator mode. */
const SignalAsyncDeco = defineAsyncConstraint<string, undefined>({
    name: 'signalAsyncDeco',
    validate: async (value) => value !== 'taken',
    message: 'Already taken'
});

describe('@decorix/angular-signal', () => {
    it('creates and validates a signal form from decorators', () => {
        registerZodValidator({name: 'zod-angular-signal-class'});

        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const form = toSignalForm(SignupDto, {initialValue: {name: 'A', email: 'bad'}});

        expect(form.valid()).toBe(false);
        expect(form.errors()).toMatchObject({name: ['Name too short'], email: ['Invalid email']});

        form.name.set('Ada');
        form.email.set('ada@example.com');

        expect(form.submit()).toMatchObject({success: true});
    });

    it('creates and validates a signal form from builder metadata', () => {
        registerZodValidator({name: 'zod-angular-signal-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const form = toSignalForm(user, {initialValue: {name: 'Ada', email: 'bad'}});

        expect(form.email.valid()).toBe(false);
        expect(form.email.errors()).toEqual(['Invalid email']);
    });

    it('throws when no validator can be resolved', () => {
        const user = model('SignupDto', {
            name: stringField().required()
        });

        expect(() => toSignalForm(user, {validator: 'missing-angular-signal-validator'})).toThrow(
            'No Decorix validator adapter registered'
        );
    });

    it('uses core validation for constraints the form facade cannot express natively', () => {
        const article = model('SignalFallbackDto', {
            slug: stringField().required().slug('Invalid slug')
        });

        const form = toSignalForm(article, {initialValue: {slug: 'Bad Slug'}});

        expect(form.slug.errors()).toEqual(['Invalid slug']);
        expect(form.submit()).toMatchObject({success: false});
    });

    it('resolves async constraints through async form hooks', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'signalAsyncAvailable',
            validate: async (value) => value !== 'taken',
            message: 'Already taken'
        });
        const metadata = model('SignalAsyncDto', {
            username: stringField().required().constraint('signalAsyncAvailable')
        });

        const form = toSignalForm(metadata, {initialValue: {username: 'taken'}});
        await expect(form.username.errorsAsync()).resolves.toEqual(['Already taken']);
        await expect(form.submitAsync()).resolves.toMatchObject({success: false});

        form.username.set('free');
        await expect(form.validAsync()).resolves.toBe(true);
        await expect(form.submitAsync()).resolves.toMatchObject({success: true});
    });

    it('enforces a custom sync constraint in builder and decorator mode', () => {
        registerZodValidator({name: 'zod-angular-signal-custom-sync'});

        const builder = model('SignalCustomSyncBuilderDto', {
            code: stringField().required().constraint(SignalStartsWithA)
        });
        const builderForm = toSignalForm(builder, {initialValue: {code: 'Bravo'}});
        expect(builderForm.code.errors()).toEqual(['Must start with A']);
        builderForm.code.set('Alpha');
        expect(builderForm.submit()).toMatchObject({success: true});

        @Model('SignalCustomSyncClassDto')
        class SignalCustomSyncClassDto {
            @Required()
            @SignalStartsWithA()
            code!: string;
        }
        const classForm = toSignalForm(SignalCustomSyncClassDto, {initialValue: {code: 'Bravo'}});
        expect(classForm.code.errors()).toEqual(['Must start with A']);
        classForm.code.set('Alpha');
        expect(classForm.submit()).toMatchObject({success: true});
    });

    it('resolves a custom async constraint declared in decorator mode', async () => {
        registerZodValidator({name: 'zod-angular-signal-async-class'});

        @Model('SignalAsyncClassDto')
        class SignalAsyncClassDto {
            @Required()
            @SignalAsyncDeco()
            username!: string;
        }

        const form = toSignalForm(SignalAsyncClassDto, {initialValue: {username: 'taken'}});
        await expect(form.username.errorsAsync()).resolves.toEqual(['Already taken']);
        form.username.set('free');
        await expect(form.validAsync()).resolves.toBe(true);
    });

    it('enforces a cross-field constraint declared in decorator mode', () => {
        registerZodValidator({name: 'zod-angular-signal-crossfield-class'});

        @Model('SignalCrossFieldClassDto')
        class SignalCrossFieldClassDto {
            @Required()
            password!: string;

            @EqualsField('password', 'Passwords must match')
            confirmPassword?: string;
        }

        const form = toSignalForm(SignalCrossFieldClassDto, {initialValue: {password: 'a', confirmPassword: 'b'}});
        expect(form.submit()).toMatchObject({success: false});
        form.confirmPassword.set('a');
        expect(form.submit()).toMatchObject({success: true});
    });

    it('enforces native number and date constraints in builder and decorator mode', () => {
        registerZodValidator({name: 'zod-angular-signal-natives'});
        const past = new Date('2000-01-01');
        const future = new Date(Date.now() + 86_400_000);

        const builder = model('SignalNativeBuilderDto', {
            age: numberField().min(18).max(65).integer(),
            createdAt: dateField().past()
        });
        const builderForm = toSignalForm(builder, {initialValue: {age: 10, createdAt: past}});
        expect(builderForm.age.valid()).toBe(false);
        builderForm.age.set(30);
        expect(builderForm.age.valid()).toBe(true);
        builderForm.createdAt.set(future);
        expect(builderForm.createdAt.valid()).toBe(false);

        @Model('SignalNativeClassDto')
        class SignalNativeClassDto {
            @Min(18)
            @Max(65)
            @Integer()
            age!: number;

            @Past()
            createdAt!: Date;
        }
        const classForm = toSignalForm(SignalNativeClassDto, {initialValue: {age: 10, createdAt: past}});
        expect(classForm.age.valid()).toBe(false);
        classForm.age.set(30);
        expect(classForm.age.valid()).toBe(true);
    });
});



