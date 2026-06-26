import {describe, expect, it} from 'vitest';
import {Email, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {DecorixPipe, DecorixValidationException} from '../src/index';

describe('@decorix/nest', () => {
    it('creates a Nest-compatible pipe from decorators', () => {
        registerZodValidator({name: 'zod-nest-class'});

        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const pipe = DecorixPipe(SignupDto);

        expect(pipe.transform({name: 'Ada', email: 'ada@example.com'})).toMatchObject({name: 'Ada'});
        expect(() => pipe.transform({name: 'A', email: 'bad'})).toThrow(DecorixValidationException);
    });

    it('creates a Nest-compatible pipe from builder metadata', () => {
        registerZodValidator({name: 'zod-nest-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const pipe = DecorixPipe(user);

        try {
            pipe.transform({name: 'A', email: 'bad'});
            throw new Error('Expected validation to fail.');
        } catch (error) {
            expect(error).toBeInstanceOf(DecorixValidationException);
            expect((error as DecorixValidationException).getResponse().issues).toEqual([
                {path: ['name'], message: 'Name too short'},
                {path: ['email'], message: 'Invalid email'}
            ]);
        }
    });

    it('throws when no validator can be resolved', () => {
        const user = model('SignupDto', {
            name: stringField().required()
        });

        expect(() => DecorixPipe(user, {validator: 'missing-nest-validator'})).toThrow(
            'No Decorix validator adapter registered'
        );
    });
});

