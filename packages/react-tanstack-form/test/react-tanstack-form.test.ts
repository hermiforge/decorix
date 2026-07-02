import {describe, expect, it} from 'vitest';
import {Email, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toTanStackForm, useTanStackDecorix} from '../src/index';

describe('@decorix/react-tanstack-form', () => {
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
        expect(config.validators.onSubmit({name: 'A', email: 'bad'})).toMatchObject({
            name: ['Name too short'],
            email: ['Invalid email']
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

        expect(config.validators.onSubmit({name: 'Ada', email: 'ada@example.com'})).toBeUndefined();
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

        expect(config.validators.onSubmit({slug: 'Bad Slug'})).toEqual({slug: ['Invalid slug']});
    });

    it('enforces V2 cross-field constraints through core validation', () => {
        const metadata = model('TanStackV2Dto', {
            password: stringField().required(),
            confirmPassword: stringField().equalsField('password', 'Passwords must match')
        });

        expect(toTanStackForm(metadata).validators.onSubmit({password: 'a', confirmPassword: 'b'})).toEqual({
            confirmPassword: ['Passwords must match']
        });
    });});



