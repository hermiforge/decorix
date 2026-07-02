import {describe, expect, it} from 'vitest';
import {createAsyncConstraint, Email, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toSignalForm} from '../src/index';

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
});



