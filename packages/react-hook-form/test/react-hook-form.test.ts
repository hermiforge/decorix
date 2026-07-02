import {describe, expect, it} from 'vitest';
import {createAsyncConstraint, Email, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toReactHookForm, useReactHookDecorix} from '../src/index';

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
    });});



