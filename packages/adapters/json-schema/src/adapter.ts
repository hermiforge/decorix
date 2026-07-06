import type {ConstraintMetadata, FieldMetadata, ModelMetadata, ModelTarget, UiMetadata} from '@decorix/core';
import {getConstraint, getModelMetadata} from '@decorix/core';
import type {JsonSchema} from './types';

/**
 * Converts Decorix metadata or a registered model class into JSON Schema draft 2020-12.
 */
export function toJsonSchema(modelOrMetadata: ModelTarget | ModelMetadata): JsonSchema {
    const metadata = getModelMetadata(modelOrMetadata);
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const field of metadata.fields) {
        properties[field.name] = fieldToSchema(field);
        if (field.required && !field.constraints.some((constraint) => constraint.name === 'optional')) {
            required.push(field.name);
        }
    }

    const schema: JsonSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: metadata.name,
        type: 'object',
        properties,
        ...(required.length ? {required} : {})
    };
    applyUnsupportedConstraints(schema, metadata.objectConstraints ?? []);
    return schema;
}

/**
 * Converts a single Decorix field into a JSON Schema fragment.
 */
export function fieldToJsonSchema(field: FieldMetadata): JsonSchema {
    return fieldToSchema(field);
}

/** Converts field metadata to a JSON Schema fragment including constraints and UI hints. */
function fieldToSchema(field: FieldMetadata): JsonSchema {
    const schema = baseSchema(field);
    applyConstraints(schema, field.constraints);
    applyUi(schema, field.ui);
    return schema;
}

/** Maps Decorix structural field metadata to the base JSON Schema shape. */
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
                if (child.required && !child.constraints.some((constraint) => constraint.name === 'optional')) {
                    required.push(child.name);
                }
            }
            return {type: 'object', properties, ...(required.length ? {required} : {})};
        }
        default:
            return assertNever(field.type);
    }
}

/** Applies native JSON Schema constraint fragments and preserves unsupported constraints. */
function applyConstraints(schema: JsonSchema, constraints: ConstraintMetadata[]): void {
    const unsupported: DecorixConstraintExtension[] = [];
    for (const constraint of constraints) {
        const definition = getConstraint(constraint.name);
        const fragment = definition?.toJsonSchema?.(constraint.options, {object: {}, value: undefined});
        if (fragment) {
            Object.assign(schema, fragment);
        } else if (!isSchemaStructuralConstraint(constraint.name)) {
            // Constraints that JSON Schema cannot represent natively remain available to consumers.
            unsupported.push(toConstraintExtension(constraint, definition?.async === true));
        }
    }
    if (unsupported.length) schema['x-decorix-constraints'] = unsupported;
}

/** Stores object-level or otherwise unsupported constraints under Decorix extension metadata. */
function applyUnsupportedConstraints(schema: JsonSchema, constraints: ConstraintMetadata[]): void {
    const unsupported = constraints.map((constraint) => toConstraintExtension(constraint, getConstraint(constraint.name)?.async === true));
    if (unsupported.length) schema['x-decorix-constraints'] = unsupported;
}

/** Converts constraint metadata to a JSON-safe x-decorix-constraints entry. */
function toConstraintExtension(constraint: ConstraintMetadata, async: boolean): DecorixConstraintExtension {
    return {
        name: constraint.name,
        ...(constraint.options === undefined ? {} : {options: serializeOption(constraint.options)}),
        ...(constraint.message === undefined ? {} : {message: constraint.message}),
        ...(constraint.groups?.length ? {groups: constraint.groups} : {}),
        ...(async ? {async: true} : {})
    };
}

/** Serializes non-JSON option values such as RegExp and Date for schema extensions. */
function serializeOption(option: unknown): unknown {
    if (typeof option === 'function') return '[function]';
    if (option instanceof RegExp) return {source: option.source, flags: option.flags};
    if (option instanceof Date) return option.toISOString();
    if (Array.isArray(option)) return option.map(serializeOption);
    if (typeof option === 'object' && option !== null) {
        return Object.fromEntries(Object.entries(option).map(([key, value]) => [key, serializeOption(value)]));
    }
    return option;
}

/** Returns whether a constraint is already represented by JSON Schema structure. */
function isSchemaStructuralConstraint(name: string): boolean {
    return name === 'required' || name === 'optional';
}

/** Applies framework-neutral UI metadata as JSON Schema annotations or Decorix extensions. */
function applyUi(schema: JsonSchema, ui?: UiMetadata): void {
    if (!ui) return;
    if (ui.label) schema.title = ui.label;
    if (ui.description) schema.description = ui.description;
    if (ui.readonly !== undefined) schema.readOnly = ui.readonly;
    if (ui.placeholder !== undefined) schema['x-decorix-placeholder'] = ui.placeholder;
    if (ui.hidden !== undefined) schema['x-decorix-hidden'] = ui.hidden;
    if (ui.order !== undefined) schema['x-decorix-order'] = ui.order;
    if (ui.group !== undefined) schema['x-decorix-group'] = ui.group;
}

type DecorixConstraintExtension = {
    name: string;
    options?: unknown;
    message?: string;
    groups?: string[];
    async?: true;
};

function assertNever(value: never): never {
    throw new Error(`Unsupported Decorix value: ${String(value)}`);
}
