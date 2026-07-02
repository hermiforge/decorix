import {describe, expect, it} from 'vitest';
import {arrayField, dateField, Email, enumField, Label, Model, model, numberField, objectConstraint, ObjectConstraint, objectField, Required, RequiredIf, stringField} from '@decorix/core';
import {toJsonSchema} from '../src/index';

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
    });});



