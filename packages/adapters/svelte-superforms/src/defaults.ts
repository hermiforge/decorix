import type {FieldMetadata, ModelMetadata} from '@hermiforge-decorix/core';

/**
 * Superforms' `ValidationAdapter.defaults` must be concrete, type-appropriate
 * values (not `undefined`) so bound inputs stay controlled — unlike
 * `defaultValuesFor` from `@hermiforge-decorix/core`, which defaults every
 * field to `undefined` when not explicitly provided. Neither Superforms'
 * own default-generation (`defaultValues(jsonSchema)`) nor its schema/shape
 * helpers are part of `sveltekit-superforms/adapters`'s public API surface
 * (verified against the installed package's `dist/adapters/index.js`), so
 * this reimplements the same intent directly from Decorix field metadata.
 */
export function defaultsForModel(metadata: ModelMetadata, provided: Record<string, unknown> = {}): Record<string, unknown> {
    return defaultsForFields(metadata.fields, provided);
}

function defaultsForFields(fields: FieldMetadata[], provided: Record<string, unknown> = {}): Record<string, unknown> {
    return Object.fromEntries(fields.map((field) => [field.name, field.name in provided ? provided[field.name] : defaultForField(field)]));
}

function defaultForField(field: FieldMetadata): unknown {
    switch (field.type) {
        case 'string':
            return '';
        case 'number':
            return 0;
        case 'boolean':
            return false;
        case 'enum':
            return field.enumValues?.[0] ?? '';
        case 'array':
            return [];
        case 'object':
            return defaultsForFields(field.fields ?? []);
        case 'date':
            // No safe non-null default exists for a date; left undefined like
            // Decorix's own `defaultValuesFor`, callers should pass one through
            // `options.initialValues` when a concrete default matters.
            return undefined;
    }
}
