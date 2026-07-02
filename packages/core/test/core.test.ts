import {describe, expect, it} from 'vitest';
import {
    arrayField,
    createAsyncConstraint,
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
    objectField,
    registerValidatorAdapter,
    Required,
    setDefaultValidatorAdapter,
    stringField,
    validate,
    validateAsync,
    type ConstraintMetadata,
    type FieldMetadata,
    type ModelMetadata
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

type ConstraintCase = {
    name: string;
    options?: unknown;
    valid: unknown;
    invalid: unknown;
    invalidParams?: Record<string, unknown>;
    typeMismatch?: {value: unknown; expected: string};
};

function fieldFor(constraint: ConstraintMetadata, required = false): FieldMetadata {
    return {name: 'value', type: 'string', required, constraints: [constraint]};
}

function metadataFor(constraint: ConstraintMetadata, required = false): ModelMetadata {
    return {name: `Native${constraint.name}Dto`, fields: [fieldFor(constraint, required)]};
}

function issueFor(value: unknown, constraint: ConstraintMetadata, required = false) {
    const result = validate({value}, metadataFor(constraint, required));
    if (result.success) throw new Error(`Expected ${constraint.name} to fail.`);
    return result.issues.find((issue) => issue.constraint === constraint.name) ?? result.issues[0];
}

const nativeCases: ConstraintCase[] = [
    {name: 'required', valid: 'value', invalid: undefined},
    {name: 'notNull', valid: 'value', invalid: null},
    {name: 'notUndefined', valid: 'value', invalid: undefined},
    {name: 'notEmpty', valid: 'value', invalid: '', typeMismatch: {value: 42, expected: 'sized'}},
    {name: 'notBlank', valid: 'value', invalid: '   ', typeMismatch: {value: 42, expected: 'string'}},
    {name: 'minLength', options: 3, valid: 'abc', invalid: 'ab', invalidParams: {value: 3}, typeMismatch: {value: 42, expected: 'string'}},
    {name: 'maxLength', options: 3, valid: 'abc', invalid: 'abcd', invalidParams: {value: 3}, typeMismatch: {value: 42, expected: 'string'}},
    {name: 'length', options: {min: 2, max: 4}, valid: 'abc', invalid: 'a', invalidParams: {min: 2, max: 4}, typeMismatch: {value: 42, expected: 'string'}},
    {name: 'pattern', options: /^[A-Z]+$/, valid: 'ABC', invalid: 'abc', invalidParams: {value: /^[A-Z]+$/}, typeMismatch: {value: 42, expected: 'string'}},
    {name: 'email', valid: 'ada@example.com', invalid: 'bad', typeMismatch: {value: 42, expected: 'string'}},
    {name: 'url', valid: 'https://example.com', invalid: 'ftp://example.com', typeMismatch: {value: 42, expected: 'string'}},
    {name: 'uuid', valid: '550e8400-e29b-41d4-a716-446655440000', invalid: 'not-a-uuid', typeMismatch: {value: 42, expected: 'string'}},
    {name: 'slug', valid: 'valid-slug-1', invalid: 'Invalid Slug', typeMismatch: {value: 42, expected: 'string'}},
    {name: 'startsWith', options: 'pre', valid: 'prefix', invalid: 'suffix', invalidParams: {value: 'pre'}, typeMismatch: {value: 42, expected: 'string'}},
    {name: 'endsWith', options: 'fix', valid: 'suffix', invalid: 'suffixy', invalidParams: {value: 'fix'}, typeMismatch: {value: 42, expected: 'string'}},
    {name: 'contains', options: 'needle', valid: 'has needle here', invalid: 'missing', invalidParams: {value: 'needle'}, typeMismatch: {value: 42, expected: 'string'}},
    {name: 'lowercase', valid: 'abc', invalid: 'Abc', typeMismatch: {value: 42, expected: 'string'}},
    {name: 'uppercase', valid: 'ABC', invalid: 'Abc', typeMismatch: {value: 42, expected: 'string'}},
    {name: 'min', options: 3, valid: 3, invalid: 2, invalidParams: {value: 3}, typeMismatch: {value: '2', expected: 'number'}},
    {name: 'max', options: 3, valid: 3, invalid: 4, invalidParams: {value: 3}, typeMismatch: {value: '4', expected: 'number'}},
    {name: 'between', options: {min: 2, max: 4}, valid: 3, invalid: 1, invalidParams: {min: 2, max: 4}, typeMismatch: {value: '3', expected: 'number'}},
    {name: 'positive', valid: 1, invalid: 0, typeMismatch: {value: '1', expected: 'number'}},
    {name: 'positiveOrZero', valid: 0, invalid: -1, typeMismatch: {value: '0', expected: 'number'}},
    {name: 'negative', valid: -1, invalid: 0, typeMismatch: {value: '-1', expected: 'number'}},
    {name: 'negativeOrZero', valid: 0, invalid: 1, typeMismatch: {value: '0', expected: 'number'}},
    {name: 'integer', valid: 1, invalid: 1.5, typeMismatch: {value: '1', expected: 'number'}},
    {name: 'finite', valid: 1, invalid: Number.POSITIVE_INFINITY, typeMismatch: {value: '1', expected: 'number'}},
    {name: 'multipleOf', options: 5, valid: 10, invalid: 12, invalidParams: {value: 5}, typeMismatch: {value: '10', expected: 'number'}},
    {name: 'past', valid: '2000-01-01T00:00:00.000Z', invalid: '2999-01-01T00:00:00.000Z'},
    {name: 'pastOrPresent', valid: '2000-01-01T00:00:00.000Z', invalid: '2999-01-01T00:00:00.000Z'},
    {name: 'future', valid: '2999-01-01T00:00:00.000Z', invalid: '2000-01-01T00:00:00.000Z'},
    {name: 'futureOrPresent', valid: '2999-01-01T00:00:00.000Z', invalid: '2000-01-01T00:00:00.000Z'},
    {name: 'before', options: '2025-01-01T00:00:00.000Z', valid: '2024-01-01T00:00:00.000Z', invalid: '2026-01-01T00:00:00.000Z', invalidParams: {value: '2025-01-01T00:00:00.000Z'}},
    {name: 'after', options: '2025-01-01T00:00:00.000Z', valid: '2026-01-01T00:00:00.000Z', invalid: '2024-01-01T00:00:00.000Z', invalidParams: {value: '2025-01-01T00:00:00.000Z'}},
    {name: 'betweenDates', options: {min: '2025-01-01T00:00:00.000Z', max: '2025-12-31T00:00:00.000Z'}, valid: '2025-06-01T00:00:00.000Z', invalid: '2026-01-01T00:00:00.000Z', invalidParams: {min: '2025-01-01T00:00:00.000Z', max: '2025-12-31T00:00:00.000Z'}},
    {name: 'minItems', options: 2, valid: ['a', 'b'], invalid: ['a'], invalidParams: {value: 2}, typeMismatch: {value: 'ab', expected: 'array'}},
    {name: 'maxItems', options: 2, valid: ['a', 'b'], invalid: ['a', 'b', 'c'], invalidParams: {value: 2}, typeMismatch: {value: 'ab', expected: 'array'}},
    {name: 'size', options: {min: 2, max: 3}, valid: ['a', 'b'], invalid: ['a'], invalidParams: {min: 2, max: 3}, typeMismatch: {value: 'ab', expected: 'array'}},
    {name: 'uniqueItems', valid: ['a', 'b'], invalid: ['a', 'a'], typeMismatch: {value: 'ab', expected: 'array'}},
    {name: 'notEmptyArray', valid: ['a'], invalid: [], typeMismatch: {value: 'ab', expected: 'array'}},
    {name: 'enum', options: ['draft', 'published'], valid: 'draft', invalid: 'archived', invalidParams: {value: ['draft', 'published']}},
    {name: 'oneOf', options: ['draft', 'published'], valid: 'published', invalid: 'archived', invalidParams: {value: ['draft', 'published']}},
    {name: 'notOneOf', options: ['archived'], valid: 'draft', invalid: 'archived', invalidParams: {value: ['archived']}}
];

const absentSkipConstraints = nativeCases
    .map((testCase) => testCase.name)
    .filter((name) => !['required', 'notNull', 'notUndefined', 'optional', 'nullable'].includes(name));

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

    it.each(nativeCases)('validates native $name constraint exhaustively', (testCase) => {
        const required = testCase.name === 'required' || testCase.name === 'notUndefined';
        const constraint = {name: testCase.name, ...(testCase.options === undefined ? {} : {options: testCase.options})};

        expect(validate({value: testCase.valid}, metadataFor(constraint, required))).toMatchObject({success: true});

        expect(issueFor(testCase.invalid, constraint, required)).toEqual({
            path: ['value'],
            code: `decorix.${testCase.name}`,
            message: expect.any(String),
            constraint: testCase.name,
            ...(testCase.invalidParams === undefined ? {} : {params: testCase.invalidParams})
        });

        expect(issueFor(testCase.invalid, {...constraint, message: 'Custom message'}, required)).toMatchObject({
            code: `decorix.${testCase.name}`,
            message: 'Custom message',
            constraint: testCase.name
        });

        if (testCase.typeMismatch) {
            expect(issueFor(testCase.typeMismatch.value, constraint, required)).toEqual({
                path: ['value'],
                code: 'decorix.type',
                message: expect.any(String),
                constraint: testCase.name,
                params: {expected: testCase.typeMismatch.expected}
            });
        }
    });

    it.each(absentSkipConstraints)('skips %s for null and undefined values', (name) => {
        const options = nativeCases.find((testCase) => testCase.name === name)?.options;
        const constraint = {name, ...(options === undefined ? {} : {options})};

        expect(validate({value: null}, metadataFor(constraint))).toMatchObject({success: true});
        expect(validate({}, metadataFor(constraint))).toMatchObject({success: true});
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

    it('keeps explicit optional and nullable skips narrow', () => {
        const metadata = model('ExplicitAbsentSemantics', {
            optional: stringField().optional().minLength(3),
            nullable: stringField().nullable().minLength(3)
        });

        expect(validate({}, metadata)).toMatchObject({success: false, issues: [{path: ['nullable'], constraint: 'required'}]});
        expect(validate({optional: null, nullable: undefined}, metadata)).toMatchObject({
            success: false,
            issues: [{path: ['nullable'], constraint: 'required'}]
        });
        expect(validate({optional: undefined, nullable: null}, metadata)).toMatchObject({success: true});
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

    it('reports nested object and array item paths', () => {
        const metadata = model('NestedPaths', {
            profile: objectField({name: stringField().minLength(2)}),
            contacts: arrayField(objectField({email: stringField().email()}))
        });

        expect(validate({profile: {name: 'A'}, contacts: [{email: 'bad'}]}, metadata)).toMatchObject({
            success: false,
            issues: [
                {path: ['profile', 'name'], constraint: 'minLength'},
                {path: ['contacts', 0, 'email'], constraint: 'email'}
            ]
        });
    });

    it('rejects async constraints from sync validation and supports validateAsync', async () => {
        createAsyncConstraint<unknown, undefined>({
            name: 'coreTestAsyncConstraint',
            validate: async () => false,
            message: 'Async failed.'
        });

        const metadata = metadataFor({name: 'coreTestAsyncConstraint'});

        expect(() => validate({value: 'x'}, metadata)).toThrow('Use validateAsync instead');
        await expect(validateAsync({value: 'x'}, metadata)).resolves.toMatchObject({
            success: false,
            issues: [{path: ['value'], constraint: 'coreTestAsyncConstraint', message: 'Async failed.'}]
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