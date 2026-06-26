import type {ConstraintMetadata, FieldMetadata, ModelMetadata, ModelTarget, UiMetadata} from '@decorix/core';
import {getModelMetadata} from '@decorix/core';
import type {JsonSchema} from './types';

/**
 * Converts Decorix metadata or a registered model class into JSON Schema draft 2020-12.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @returns A JSON Schema document representing the Decorix model.
 */
export function toJsonSchema(modelOrMetadata: ModelTarget | ModelMetadata): JsonSchema {
    const metadata = getModelMetadata(modelOrMetadata);
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const field of metadata.fields) {
        properties[field.name] = fieldToSchema(field);
        if (field.required) {
            required.push(field.name);
        }
    }

    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: metadata.name,
        type: 'object',
        properties,
        ...(required.length ? {required} : {})
    };
}

/**
 * Converts a single Decorix field into a JSON Schema fragment.
 *
 * @param field - Field metadata to convert.
 * @returns A JSON Schema fragment.
 */
export function fieldToJsonSchema(field: FieldMetadata): JsonSchema {
    return fieldToSchema(field);
}

function fieldToSchema(field: FieldMetadata): JsonSchema {
    const schema = baseSchema(field);
    applyConstraints(schema, field.constraints);
    applyUi(schema, field.ui);
    return schema;
}

function baseSchema(field: FieldMetadata): JsonSchema {
    switch (field.type) {
        case 'string':
            return {type: 'string'};
        case 'number':
            return {type: 'number'};
        case 'boolean':
            return {type: 'boolean'};
        case 'date':
            return {type: 'string', format: 'date-time'};
        case 'enum':
            return {type: 'string', enum: field.enumValues ?? []};
        case 'array':
            return {type: 'array', items: field.item ? fieldToSchema(field.item) : {}};
        case 'object': {
            const properties: Record<string, JsonSchema> = {};
            const required: string[] = [];
            for (const child of field.fields ?? []) {
                properties[child.name] = fieldToSchema(child);
                if (child.required) {
                    required.push(child.name);
                }
            }
            return {type: 'object', properties, ...(required.length ? {required} : {})};
        }
        default:
            return assertNever(field.type);
    }
}

function applyConstraints(schema: JsonSchema, constraints: ConstraintMetadata[]): void {
    for (const constraint of constraints) {
        switch (constraint.kind) {
            case 'required':
                break;
            case 'minLength':
                schema.minLength = constraint.value;
                break;
            case 'maxLength':
                schema.maxLength = constraint.value;
                break;
            case 'min':
                schema.minimum = constraint.value;
                break;
            case 'max':
                schema.maximum = constraint.value;
                break;
            case 'email':
                schema.format = 'email';
                break;
            case 'pattern':
                schema.pattern = constraint.value.source;
                break;
            default:
                assertNever(constraint);
        }
    }
}

function applyUi(schema: JsonSchema, ui?: UiMetadata): void {
    if (!ui) {
        return;
    }

    if (ui.label) {
        schema.title = ui.label;
    }
    if (ui.description) {
        schema.description = ui.description;
    }
    if (ui.readonly !== undefined) {
        schema.readOnly = ui.readonly;
    }
    if (ui.placeholder !== undefined) {
        schema['x-decorix-placeholder'] = ui.placeholder;
    }
    if (ui.hidden !== undefined) {
        schema['x-decorix-hidden'] = ui.hidden;
    }
    if (ui.order !== undefined) {
        schema['x-decorix-order'] = ui.order;
    }
    if (ui.group !== undefined) {
        schema['x-decorix-group'] = ui.group;
    }
}

function assertNever(value: never): never {
    throw new Error(`Unsupported Decorix value: ${String(value)}`);
}
