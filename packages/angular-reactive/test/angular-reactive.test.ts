import {describe, expect, it} from 'vitest';
import {Email, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toReactiveFormConfig} from '../src/index';

describe('@decorix/angular-reactive', () => {
    it('creates reactive field config from decorators without a runtime validator', () => {
        @Model('SignupDto')
        class SignupDto {
            @Required('Name required')
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const config = toReactiveFormConfig(SignupDto, {initialValue: {name: 'Ada'}});

        expect(config.validate).toBeUndefined();
        expect(config.fields[0]).toMatchObject({
            name: 'name',
            required: true,
            validators: [
                {kind: 'minLength', value: 2, message: 'Name too short'},
                {kind: 'required', message: 'Name required'}
            ]
        });
    });

    it('adds generic validation for builder metadata when Zod is registered', () => {
        registerZodValidator({name: 'zod-angular-reactive-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const config = toReactiveFormConfig(user);

        expect(config.validate?.({name: 'A', email: 'bad'})).toMatchObject({success: false});
    });
});

