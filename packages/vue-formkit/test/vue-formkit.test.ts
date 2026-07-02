import {describe, expect, it} from 'vitest';
import {Email, Label, MinLength, Model, model, numberField, Required, stringField} from '@decorix/core';
import {registerZodValidator} from '@decorix/zod';
import {toFormKit, useFormKitDecorix} from '../src/index';

describe('@decorix/vue-formkit', () => {
    it('creates FormKit schema from decorators with core runtime validation', () => {
        @Model('SignupDto')
        class SignupDto {
            @Required()
            @MinLength(2, 'Name too short')
            @Label('Name')
            name!: string;

            @Required()
            @Email('Invalid email')
            email!: string;
        }

        const config = toFormKit(SignupDto);

        expect(config.validate?.({name: 'A', email: 'bad'})).toMatchObject({success: false});
        expect(config.schema[0]).toMatchObject({
            $formkit: 'text',
            name: 'name',
            label: 'Name',
            validation: 'required|minLength:2'
        });
    });

    it('creates FormKit schema from builder metadata and can attach Zod validation', () => {
        registerZodValidator({name: 'zod-formkit-builder'});
        const user = model('SignupDto', {
            name: stringField().required().minLength(2, 'Name too short'),
            email: stringField().required().email('Invalid email'),
            age: numberField().min(18, 'Too young').optional()
        });

        const config = useFormKitDecorix(user);

        expect(config.schema[1]?.validation).toBe('required|email');
        expect(config.validate?.({name: 'A', email: 'bad'})).toMatchObject({success: false});
    });

    it('uses core validation for constraints FormKit strings cannot express natively', () => {
        const article = model('FormKitFallbackDto', {
            slug: stringField().required().slug('Invalid slug')
        });

        const config = toFormKit(article);

        expect(config.validate?.({slug: 'Bad Slug'})).toMatchObject({success: false, issues: [{message: 'Invalid slug'}]});
    });

    it('snapshots FormKit validation strings', () => {
        const metadata = model('FormKitValidationSnapshotDto', {
            title: stringField().required().minLength(3).maxLength(20),
            email: stringField().email().optional(),
            age: numberField().min(18).max(65).optional()
        });

        const config = toFormKit(metadata);

        expect(config.schema.map((field) => ({
            formkit: field.$formkit,
            name: field.name,
            validation: field.validation
        }))).toMatchInlineSnapshot(`
[
  {
    "formkit": "text",
    "name": "title",
    "validation": "required|minLength:3|maxLength:20",
  },
  {
    "formkit": "text",
    "name": "email",
    "validation": "email|optional",
  },
  {
    "formkit": "number",
    "name": "age",
    "validation": "min:18|max:65|optional",
  },
]
`);
    });
});




