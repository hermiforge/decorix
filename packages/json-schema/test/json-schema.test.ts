import {describe, expect, it} from 'vitest';
import {Email, Label, Model, model, numberField, Required, stringField} from '@decorix/core';
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
});



