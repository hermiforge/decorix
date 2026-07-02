import {describe, expect, it} from 'vitest';
import {
    createObjectConstraint,
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
    Nullable,
    numberField,
    registerValidatorAdapter,
    Required,
    setDefaultValidatorAdapter,
    stringField,
    validate
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

    it('validates native constraints with stable issues', () => {
        const user = model('UserDto', {
            name: stringField().required('Name required').minLength(2, 'Name too short'),
            email: stringField().email(),
            age: numberField().min(18)
        });

        const result = validate({name: '', email: 'invalid', age: 16}, user);

        expect(result).toMatchObject({
            success: false,
            issues: [
                {path: ['name'], code: 'decorix.minLength', message: 'Name too short', constraint: 'minLength'},
                {path: ['email'], code: 'decorix.email', constraint: 'email'},
                {path: ['age'], code: 'decorix.min', constraint: 'min', params: {value: 18}}
            ]
        });
    });

    it('handles required, optional, and nullable semantics', () => {
        const metadata = model('Example', {
            implicit: stringField(),
            optional: stringField().optional().minLength(3),
            nullable: stringField().nullable().minLength(3),
            required: stringField().required()
        });

        const result = validate({nullable: null}, metadata);

        expect(result).toMatchObject({
            success: false,
            issues: [
                {path: ['implicit'], code: 'decorix.required', constraint: 'required'},
                {path: ['required'], code: 'decorix.required', constraint: 'required'}
            ]
        });
    });

    it('filters grouped constraints while always running ungrouped constraints', () => {
        const metadata = model('Grouped', {
            value: stringField().minLength(5).maxLength(3, {groups: ['strict']})
        });

        expect(validate({value: 'abcd'}, metadata)).toMatchObject({success: false});
        expect(validate({value: 'abcd'}, metadata, {group: 'strict'})).toMatchObject({
            success: false,
            issues: [
                {constraint: 'minLength'},
                {constraint: 'maxLength'}
            ]
        });
    });

    it('registers and selects validator adapters', () => {
        registerValidatorAdapter(passthroughValidator);
        setDefaultValidatorAdapter('core-test-validator');

        expect(getValidatorAdapter('core-test-validator')).toBe(passthroughValidator);
        expect(getDefaultValidatorAdapter()).toBe(passthroughValidator);
    });
    it('runs object-level constraints during core validation', () => {
        createObjectConstraint<Record<string, unknown>, undefined>({
            name: 'coreTestPasswordMatch',
            kind: 'object',
            validate(value) {
                return value.password === value.confirmPassword || {path: ['confirmPassword'], message: 'Passwords must match.'};
            }
        });

        const metadata = {
            name: 'PasswordDto',
            fields: [
                stringField().required().build('password'),
                stringField().required().build('confirmPassword')
            ],
            objectConstraints: [{name: 'coreTestPasswordMatch'}]
        };

        expect(validate({password: 'a', confirmPassword: 'b'}, metadata)).toMatchObject({
            success: false,
            issues: [
                {path: ['confirmPassword'], constraint: 'coreTestPasswordMatch', message: 'Passwords must match.'}
            ]
        });
    });
});

