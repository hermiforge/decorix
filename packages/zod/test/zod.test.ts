import {describe, expect, it} from 'vitest';
import {Email, getModelMetadata, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {createZodValidatorAdapter, registerZodValidator, toZod} from '../src/index';

describe('@decorix/zod', () => {
    it('validates builder-declared schemas', () => {
        const user = model('UserDto', {
            name: stringField().required('Name required').minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const schema = toZod(user);

        expect(schema.safeParse({name: 'Ada', email: 'ada@example.com', age: 37}).success).toBe(true);
        expect(schema.safeParse({name: 'A', email: 'bad', age: 12}).success).toBe(false);
    });

    it('validates decorator-declared schemas through the generic adapter', () => {
        @Model('UserDto')
        class UserDto {
            @Required()
            @MinLength(2, 'Name too short')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const adapter = createZodValidatorAdapter({name: 'zod-test-direct'});
        const result = adapter.createSchema(getModelMetadata(UserDto)).validate({name: 'A', email: 'bad'});

        expect(result.success).toBe(false);
        expect(result.success ? [] : result.issues.map((issue) => issue.message)).toEqual([
            'Name too short',
            'Invalid email'
        ]);
    });

    it('registers the Zod adapter as the default validator', () => {
        const adapter = registerZodValidator({name: 'zod-test-default'});

        expect(adapter.name).toBe('zod-test-default');
    });
});

