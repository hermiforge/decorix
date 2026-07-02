import {describe, expect, it} from 'vitest';
import {createAsyncConstraint, Email, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toVeeValidate, useVeeDecorix} from '../src/index';

describe('@decorix/vue-vee-validate', () => {
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
    });});



