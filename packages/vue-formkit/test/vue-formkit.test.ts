import {describe, expect, it} from 'vitest';
import {Email, Label, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toFormKit, useFormKitDecorix} from '../src/index';

describe('@decorix/vue-formkit', () => {
    it('creates FormKit schema from decorators without a runtime validator', () => {
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

        expect(config.validate).toBeUndefined();
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
});

