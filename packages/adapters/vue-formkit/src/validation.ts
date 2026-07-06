import type {FieldMetadata} from '@hermiforge-decorix/core';

/**
 * Maps Decorix field metadata to the closest FormKit input type.
 */
export function formKitType(field: FieldMetadata): string {
    switch (field.type) {
        case 'number':
            return 'number';
        case 'boolean':
            return 'checkbox';
        case 'date':
            return 'datetime-local';
        case 'enum':
            return 'select';
        default:
            // FormKit text inputs are the safest fallback for object/string-like fields.
            return 'text';
    }
}

/**
 * Converts Decorix constraints into FormKit's pipe-delimited validation string.
 */
export function formKitValidation(field: FieldMetadata): string {
    const rules = field.required ? ['required'] : [];
    for (const constraint of field.constraints) {
        if (constraint.name === 'required') {
            continue;
        }
        if (constraint.options !== undefined) {
            // RegExp objects are serialized to their source because FormKit validation strings cannot carry objects.
            rules.push(`${constraint.name}:${constraint.options instanceof RegExp ? constraint.options.source : constraint.options}`);
        } else {
            rules.push(constraint.name);
        }
    }
    return rules.join('|');
}