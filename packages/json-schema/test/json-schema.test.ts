import {describe, expect, it} from 'vitest';
import {arrayField, dateField, defineConstraint, Email, enumField, Label, Model, model, numberField, objectConstraint, ObjectConstraint, objectField, Required, RequiredIf, stringField, validate} from '@decorix/core';
import {fromJsonSchema, toJsonSchema} from '../src/index';

/** Reusable custom field constraint for the decorator/builder preservation test. */
const jsonStartsWithA = defineConstraint<string, undefined>({
    name: 'jsonSchemaStartsWithA',
    validate: (value) => typeof value === 'string' && value.startsWith('A'),
    message: 'Must start with A'
});

describe('@decorix/json-schema', () => {
    it('emits JSON Schema for builder-declared metadata', () => {
        const user = model('UserDto', {
            email: stringField().required().email().label('Email'),
            age: numberField().min(18).optional()
        });

        expect(toJsonSchema(user)).toMatchObject({
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            title: 'UserDto',
            required: ['email'],
            properties: {
                email: {type: 'string', format: 'email', title: 'Email'}
            }
        });
    });

    it('emits JSON Schema for decorator-declared metadata', () => {
        @Model('UserDto')
        class UserDto {
            @Required()
            @Email()
            @Label('Email')
            email!: string;
        }

        expect(toJsonSchema(UserDto)).toMatchObject({
            title: 'UserDto',
            required: ['email'],
            properties: {
                email: {type: 'string', format: 'email', title: 'Email'}
            }
        });
    });

    it('preserves non-exportable constraints in x-decorix-constraints', () => {
        const article = model('ArticleDtoJsonSchemaFallback', {
            slug: stringField().required().slug('Invalid slug')
        });

        expect(toJsonSchema(article)).toMatchObject({
            properties: {
                slug: {
                    type: 'string',
                    'x-decorix-constraints': [
                        {name: 'slug', message: 'Invalid slug'}
                    ]
                }
            }
        });
    });

    it('snapshots a broad JSON Schema output shape', () => {
        const metadata = model('BroadSchemaSnapshotDto', {
            id: stringField().required().uuid().label('Identifier'),
            name: stringField().minLength(2).maxLength(40).pattern(/^[A-Za-z ]+$/),
            age: numberField().between(18, 65).integer().optional(),
            status: enumField(['draft', 'published']),
            publishedAt: dateField().before('2030-01-01T00:00:00.000Z').optional(),
            tags: arrayField(stringField().minLength(2)).minItems(1).uniqueItems(),
            profile: objectField({
                website: stringField().url().optional(),
                nickname: stringField().nullable().maxLength(20)
            })
        });

        expect(toJsonSchema(metadata)).toMatchInlineSnapshot(`
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {
    "age": {
      "maximum": 65,
      "minimum": 18,
      "type": "integer",
    },
    "id": {
      "format": "uuid",
      "title": "Identifier",
      "type": "string",
    },
    "name": {
      "maxLength": 40,
      "minLength": 2,
      "pattern": "^[A-Za-z ]+$",
      "type": "string",
    },
    "profile": {
      "properties": {
        "nickname": {
          "maxLength": 20,
          "type": "string",
          "x-decorix-constraints": [
            {
              "name": "nullable",
            },
          ],
        },
        "website": {
          "format": "uri",
          "type": "string",
        },
      },
      "required": [
        "nickname",
      ],
      "type": "object",
    },
    "publishedAt": {
      "format": "date-time",
      "type": "string",
      "x-decorix-constraints": [
        {
          "name": "before",
          "options": "2030-01-01T00:00:00.000Z",
        },
      ],
    },
    "status": {
      "enum": [
        "draft",
        "published",
      ],
      "type": "string",
    },
    "tags": {
      "items": {
        "minLength": 2,
        "type": "string",
      },
      "minItems": 1,
      "type": "array",
      "uniqueItems": true,
    },
  },
  "required": [
    "id",
    "name",
    "status",
    "tags",
    "profile",
  ],
  "title": "BroadSchemaSnapshotDto",
  "type": "object",
}
`);
    });

    it('preserves V2 constraints and serializes function options safely', () => {
        @ObjectConstraint<{password?: string; confirmPassword?: string}>({
            path: 'confirmPassword',
            validator: (object) => object.password === object.confirmPassword,
            message: 'Passwords must match'
        })
        @Model('SchemaV2DecoratorDto')
        class SchemaV2DecoratorDto {
            @RequiredIf<{mode?: string}>((object) => object.mode === 'advanced')
            token?: string;
        }

        expect(toJsonSchema(SchemaV2DecoratorDto)).toMatchObject({
            properties: {
                token: {
                    'x-decorix-constraints': [
                        {name: 'requiredIf', options: {predicate: '[function]'}}
                    ]
                }
            },
            'x-decorix-constraints': [
                {name: 'objectConstraint', options: {path: ['confirmPassword'], validator: '[function]'}, message: 'Passwords must match'}
            ]
        });

        const metadata = model('SchemaV2BuilderDto', {
            confirmPassword: stringField().equalsField('password'),
            max: numberField().greaterThanField('min')
        }, [objectConstraint<Record<string, unknown>, undefined>('schemaNamedObjectConstraint', {validate: () => false}, {groups: ['strict']})]);

        expect(toJsonSchema(metadata)).toMatchObject({
            properties: {
                confirmPassword: {'x-decorix-constraints': [{name: 'equalsField', options: {path: 'password'}}]},
                max: {'x-decorix-constraints': [{name: 'greaterThanField', options: {path: 'min'}}]}
            },
            'x-decorix-constraints': [{name: 'schemaNamedObjectConstraint', groups: ['strict']}]
        });
    });

    it('preserves a custom field constraint from decorator and builder mode and round-trips it', () => {
        @Model('JsonSchemaCustomClassDto')
        class JsonSchemaCustomClassDto {
            @Required()
            @jsonStartsWithA.decorator('Must start with A')
            code!: string;
        }

        const exported = toJsonSchema(JsonSchemaCustomClassDto);
        expect(exported).toMatchObject({
            properties: {
                code: {'x-decorix-constraints': [{name: 'jsonSchemaStartsWithA', message: 'Must start with A'}]}
            }
        });

        // The builder attaches the same registered constraint by name.
        const builder = model('JsonSchemaCustomBuilderDto', {
            code: stringField().required().constraint('jsonSchemaStartsWithA', undefined, 'Must start with A')
        });
        expect(toJsonSchema(builder)).toMatchObject({
            properties: {
                code: {'x-decorix-constraints': [{name: 'jsonSchemaStartsWithA', message: 'Must start with A'}]}
            }
        });

        // Export/import/export is stable for the preserved custom constraint.
        expect(toJsonSchema(fromJsonSchema(exported))).toEqual(exported);
    });

    it('round-trips a broad Decorix-exported schema unchanged', () => {
        const metadata = model('BroadSchemaSnapshotDto', {
            id: stringField().required().uuid().label('Identifier'),
            name: stringField().minLength(2).maxLength(40).pattern(/^[A-Za-z ]+$/),
            age: numberField().between(18, 65).integer().optional(),
            status: enumField(['draft', 'published']),
            publishedAt: dateField().before('2030-01-01T00:00:00.000Z').optional(),
            tags: arrayField(stringField().minLength(2)).minItems(1).uniqueItems(),
            profile: objectField({
                website: stringField().url().optional(),
                nickname: stringField().nullable().maxLength(20)
            })
        });

        const exported = toJsonSchema(metadata);
        // Import then re-export must reproduce the original schema shape exactly.
        expect(toJsonSchema(fromJsonSchema(exported))).toEqual(exported);
    });

    it('imports standard JSON Schema keywords into validatable native constraints', () => {
        const schema = {
            title: 'ImportedUserDto',
            type: 'object',
            properties: {
                email: {type: 'string', format: 'email'},
                name: {type: 'string', minLength: 2, maxLength: 5, pattern: '^[a-z]+$'},
                age: {type: 'integer', minimum: 18, maximum: 40},
                score: {type: 'number', multipleOf: 5},
                role: {type: 'string', enum: ['admin', 'user']},
                tags: {type: 'array', items: {type: 'string'}, minItems: 1, uniqueItems: true}
            },
            required: ['email', 'name', 'age', 'score', 'role', 'tags']
        };

        const metadata = fromJsonSchema(schema);

        expect(validate(
            {email: 'a@b.co', name: 'abc', age: 25, score: 10, role: 'admin', tags: ['x']},
            metadata
        )).toMatchObject({success: true});

        expect(validate(
            {email: 'nope', name: 'toolong', age: 5, score: 3, role: 'ghost', tags: ['x', 'x']},
            metadata
        )).toMatchObject({success: false});
    });

    it('preserves x-decorix-constraints including RegExp and function sentinels', () => {
        const schema = {
            title: 'PreserveDto',
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    'x-decorix-constraints': [
                        {name: 'customRegex', options: {source: '^ab$', flags: 'i'}, message: 'Bad code', groups: ['strict']},
                        {name: 'requiredIf', options: {predicate: '[function]'}}
                    ]
                }
            },
            'x-decorix-constraints': [
                {name: 'objectConstraint', options: {path: ['code'], validator: '[function]'}, async: true}
            ]
        } as const;

        const metadata = fromJsonSchema(schema);
        const code = metadata.fields[0];

        // RegExp options are reconstructed; function sentinels are preserved verbatim.
        expect(code.constraints).toMatchObject([
            {name: 'optional'},
            {name: 'customRegex', options: {source: '^ab$'}, message: 'Bad code', groups: ['strict']},
            {name: 'requiredIf', options: {predicate: '[function]'}}
        ]);
        expect(code.constraints[1].options).toBeInstanceOf(RegExp);
        expect(code.constraints[1].options).toMatchObject({source: '^ab$', flags: 'i'});
        expect(metadata.objectConstraints).toMatchObject([{name: 'objectConstraint', options: {path: ['code'], validator: '[function]'}}]);

        // The whole shape survives an export/import/export round-trip.
        const exported = toJsonSchema(metadata);
        expect(toJsonSchema(fromJsonSchema(exported))).toEqual(exported);
    });

    it('reconstructs nested objects, required flags, and UI hints', () => {
        const schema = {
            title: 'NestedDto',
            type: 'object',
            properties: {
                name: {type: 'string', title: 'Full name', description: 'Legal name', readOnly: true, 'x-decorix-order': 1, 'x-decorix-group': 'main'},
                address: {
                    type: 'object',
                    properties: {
                        city: {type: 'string'},
                        zip: {type: 'string'}
                    },
                    required: ['city']
                }
            },
            required: ['name']
        };

        const metadata = fromJsonSchema(schema);

        expect(metadata.fields[0].ui).toMatchObject({label: 'Full name', description: 'Legal name', readonly: true, order: 1, group: 'main'});
        const address = metadata.fields[1];
        expect(address.type).toBe('object');
        expect(address.fields?.map((f) => [f.name, f.required])).toEqual([['city', true], ['zip', false]]);
        // The optional zip field is skipped, while the missing required city fails.
        expect(validate({name: 'A', address: {}}, metadata)).toMatchObject({
            success: false,
            issues: [{path: ['address', 'city'], constraint: 'required'}]
        });
    });});



