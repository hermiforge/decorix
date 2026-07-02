import type {ConstraintMetadata, FieldMetadata, ModelMetadata} from './types';

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
        fields: metadata.fields.map(cloneFieldMetadata),
        objectConstraints: metadata.objectConstraints?.map(cloneConstraintMetadata)
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
        constraints: field.constraints.map(cloneConstraintMetadata),
        ui: field.ui ? {...field.ui} : undefined,
        fields: field.fields?.map(cloneFieldMetadata),
        item: field.item ? cloneFieldMetadata(field.item) : undefined,
        enumValues: field.enumValues ? [...field.enumValues] as [string, ...string[]] : undefined
    };
}

function cloneConstraintMetadata(constraint: ConstraintMetadata): ConstraintMetadata {
    return {
        ...constraint,
        options: cloneOption(constraint.options),
        groups: constraint.groups ? [...constraint.groups] : undefined
    };
}

function cloneOption<T>(value: T): T {
    if (Array.isArray(value)) {
        return [...value] as T;
    }
    if (value instanceof RegExp || value instanceof Date || value === null || typeof value !== 'object') {
        return value;
    }
    return {...value as Record<string, unknown>} as T;
}
