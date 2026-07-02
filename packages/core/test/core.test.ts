import {describe, expect, it} from 'vitest';
import {
    arrayField,
    BeforeField,
    EqualsField,
    ForbiddenIf,
    GreaterThanField,
    ObjectConstraint,
    RequiredIf,
    dateField,
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
    objectConstraint,
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

    it('validates V2 cross-field constraints and preserves metadata parity', () => {
        @Model('V2DecoratorDto')
        class V2DecoratorDto {
            @EqualsField('password', 'Passwords must match')
            confirmPassword?: string;

            @GreaterThanField('min')
            max?: number;

            @BeforeField('end')
            start?: string;

            @RequiredIf<{mode?: string}>((object) => object.mode === 'advanced', 'Token required')
            token?: string;

            @ForbiddenIf<{locked?: boolean}>((object) => object.locked === true, 'Note forbidden')
            note?: string;
        }

        expect(getModelMetadata(V2DecoratorDto).fields.map((field) => [field.name, field.constraints[0]?.name, field.constraints[0]?.options])).toEqual([
            ['confirmPassword', 'equalsField', {path: 'password'}],
            ['max', 'greaterThanField', {path: 'min'}],
            ['start', 'beforeField', {path: 'end'}],
            ['token', 'requiredIf', {predicate: expect.any(Function)}],
            ['note', 'forbiddenIf', {predicate: expect.any(Function)}]
        ]);

        const builderMetadata = model('V2BuilderDto', {
            confirmPassword: stringField().equalsField('password', 'Passwords must match'),
            max: numberField().greaterThanField('min'),
            min: numberField().optional(),
            start: dateField().beforeField('end'),
            end: dateField().optional(),
            token: stringField().optional().requiredIf<{mode?: string}>((object) => object.mode === 'advanced', 'Token required'),
            note: stringField().forbiddenIf<{locked?: boolean}>((object) => object.locked === true, 'Note forbidden')
        });

        expect(validate({password: 'a', confirmPassword: 'b', min: 3, max: 2, start: '2026-01-02', end: '2026-01-01', mode: 'advanced', locked: true, note: 'x'}, builderMetadata)).toMatchObject({
            success: false,
            issues: [
                {path: ['confirmPassword'], code: 'decorix.equalsField', message: 'Passwords must match', constraint: 'equalsField', params: {path: 'password'}},
                {path: ['max'], code: 'decorix.greaterThanField', constraint: 'greaterThanField', params: {path: 'min'}},
                {path: ['start'], code: 'decorix.beforeField', constraint: 'beforeField', params: {path: 'end'}},
                {path: ['token'], code: 'decorix.requiredIf', message: 'Token required', constraint: 'requiredIf', params: {predicate: expect.any(Function)}},
                {path: ['note'], code: 'decorix.forbiddenIf', message: 'Note forbidden', constraint: 'forbiddenIf', params: {predicate: expect.any(Function)}}
            ]
        });

        expect(validate({password: 'a'}, model('V2SkipDto', {
            confirmPassword: stringField().equalsField('password').optional(),
            max: numberField().greaterThanField('min').optional(),
            start: dateField().beforeField('end').optional()
        }))).toMatchObject({success: true});
    });

    it('validates every V2 native cross-field constraint with grouping and type checks', () => {
        const cases = [
            {name: 'equalsField', options: {path: 'other'}, valid: {value: 1, other: 1}, invalid: {value: 1, other: 2}},
            {name: 'notEqualsField', options: {path: 'other'}, valid: {value: 1, other: 2}, invalid: {value: 1, other: 1}},
            {name: 'greaterThanField', options: {path: 'other'}, valid: {value: 2, other: 1}, invalid: {value: 1, other: 2}, typeInvalid: {value: '2', other: 1}, expected: 'number'},
            {name: 'greaterOrEqualField', options: {path: 'other'}, valid: {value: 2, other: 2}, invalid: {value: 1, other: 2}},
            {name: 'lessThanField', options: {path: 'other'}, valid: {value: 1, other: 2}, invalid: {value: 2, other: 1}},
            {name: 'lessOrEqualField', options: {path: 'other'}, valid: {value: 2, other: 2}, invalid: {value: 3, other: 2}},
            {name: 'beforeField', options: {path: 'other'}, valid: {value: '2026-01-01', other: '2026-01-02'}, invalid: {value: '2026-01-02', other: '2026-01-01'}, typeInvalid: {value: 'bad', other: '2026-01-01'}, expected: 'date'},
            {name: 'afterField', options: {path: 'other'}, valid: {value: '2026-01-02', other: '2026-01-01'}, invalid: {value: '2026-01-01', other: '2026-01-02'}}
        ];

        for (const testCase of cases) {
            const metadata = {name: `V2${testCase.name}`, fields: [{name: 'value', type: 'string' as const, required: false, constraints: [{name: testCase.name, options: testCase.options, groups: ['strict']}]}]};
            expect(validate(testCase.valid, metadata, {group: 'strict'})).toMatchObject({success: true});
            expect(validate(testCase.invalid, metadata, {group: 'strict'})).toMatchObject({success: false, issues: [{path: ['value'], code: `decorix.${testCase.name}`, constraint: testCase.name, params: testCase.options}]});
            expect(validate(testCase.invalid, metadata)).toMatchObject({success: true});
            if (testCase.typeInvalid) {
                expect(validate(testCase.typeInvalid, metadata, {group: 'strict'})).toMatchObject({success: false, issues: [{code: 'decorix.type', params: {expected: testCase.expected}}]});
            }
        }
    });

    it('validates object constraints from decorators and builder helpers', () => {
        @ObjectConstraint<{password?: string; confirmPassword?: string}>({
            path: 'confirmPassword',
            validator: (object) => object.password === object.confirmPassword,
            message: 'Passwords must match',
            groups: ['strict']
        })
        @Model('ObjectConstraintDecoratorDto')
        class ObjectConstraintDecoratorDto {
            password?: string;
            confirmPassword?: string;
        }

        expect(validate({password: 'a', confirmPassword: 'b'}, ObjectConstraintDecoratorDto)).toMatchObject({success: true});
        expect(validate({password: 'a', confirmPassword: 'b'}, ObjectConstraintDecoratorDto, {group: 'strict'})).toMatchObject({
            success: false,
            issues: [{path: ['confirmPassword'], constraint: 'objectConstraint', message: 'Passwords must match'}]
        });

        const metadata = model('ObjectConstraintBuilderDto', {
            password: stringField().optional(),
            confirmPassword: stringField().optional()
        }, [objectConstraint<Record<string, unknown>, undefined>('builderPasswordMatch', {
            validate: (value) => value.password === value.confirmPassword || {path: ['nested', 'confirmPassword'], message: 'Nested mismatch'}
        })]);

        expect(validate({password: 'a', confirmPassword: 'b'}, metadata)).toMatchObject({
            success: false,
            issues: [{path: ['nested', 'confirmPassword'], constraint: 'builderPasswordMatch', message: 'Nested mismatch'}]
        });

        const rootPathMetadata = model('RootObjectConstraintDto', {}, [objectConstraint<Record<string, unknown>, undefined>('rootObjectFailure', {validate: () => false})]);
        expect(validate({}, rootPathMetadata)).toMatchObject({success: false, issues: [{path: [], constraint: 'rootObjectFailure'}]});
    });});