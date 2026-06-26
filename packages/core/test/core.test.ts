import {describe, expect, it} from 'vitest';
import {
    Email,
    getDefaultValidatorAdapter,
    getModelMetadata,
    getValidatorAdapter,
    Label,
    MaxLength,
    Min,
    MinLength,
    Model,
    model,
    numberField,
    registerValidatorAdapter,
    Required,
    setDefaultValidatorAdapter,
    stringField
} from '../src/index';

const passthroughValidator = {
    name: 'core-test-validator',
    createSchema() {
        return {
            validate(value: unknown) {
                return {success: true as const, data: value};
            }
        };
    }
};

describe('@decorix/core', () => {
    it('creates metadata with the builder API', () => {
        const user = model('UserDto', {
            name: stringField().required().minLength(2).maxLength(50).label('Name'),
            email: stringField().required().email(),
            age: numberField().min(18).optional()
        });

        expect(user).toMatchObject({
            name: 'UserDto',
            fields: [
                {name: 'name', type: 'string', required: true, ui: {label: 'Name'}},
                {name: 'email', type: 'string', required: true},
                {name: 'age', type: 'number', required: false}
            ]
        });
    });

    it('creates equivalent metadata with decorators', () => {
        @Model('UserDto')
        class UserDto {
            @Required()
            @MinLength(2)
            @MaxLength(50)
            @Label('Name')
            name!: string;

            @Required()
            @Email()
            email!: string;

            @Min(18)
            age?: number;
        }

        expect(getModelMetadata(UserDto)).toMatchObject({
            name: 'UserDto',
            fields: [
                {name: 'name', type: 'string', required: true, ui: {label: 'Name'}},
                {name: 'email', type: 'string', required: true},
                {name: 'age', type: 'number', required: false}
            ]
        });
    });

    it('registers and selects validator adapters', () => {
        registerValidatorAdapter(passthroughValidator);
        setDefaultValidatorAdapter('core-test-validator');

        expect(getValidatorAdapter('core-test-validator')).toBe(passthroughValidator);
        expect(getDefaultValidatorAdapter()).toBe(passthroughValidator);
    });
});
