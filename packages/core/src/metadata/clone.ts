import type {FieldMetadata, ModelMetadata} from './types';

/**
 * Returns true when a value looks like Decorix model metadata.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is model metadata.
 */
export function isModelMetadata(value: unknown): value is ModelMetadata {
    return typeof value === 'object' && value !== null && 'name' in value && 'fields' in value;
}

/**
 * Creates a defensive clone of model metadata.
 *
 * @param metadata - Model metadata to clone.
 * @returns A new metadata object.
 */
export function cloneModelMetadata(metadata: ModelMetadata): ModelMetadata {
    return {
        name: metadata.name,
        fields: metadata.fields.map(cloneFieldMetadata)
    };
}

/**
 * Creates a defensive clone of field metadata.
 *
 * @param field - Field metadata to clone.
 * @returns A new field metadata object.
 */
export function cloneFieldMetadata(field: FieldMetadata): FieldMetadata {
    return {
        ...field,
        constraints: field.constraints.map((constraint) => ({...constraint})),
        ui: field.ui ? {...field.ui} : undefined,
        fields: field.fields?.map(cloneFieldMetadata),
        item: field.item ? cloneFieldMetadata(field.item) : undefined,
        enumValues: field.enumValues ? [...field.enumValues] as [string, ...string[]] : undefined
    };
}
