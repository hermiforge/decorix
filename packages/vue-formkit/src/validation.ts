import type {FieldMetadata} from '@decorix/core';

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
            return 'text';
    }
}

export function formKitValidation(field: FieldMetadata): string {
    const rules = field.required ? ['required'] : [];
    for (const constraint of field.constraints) {
        if (constraint.kind === 'required') {
            continue;
        }
        if ('value' in constraint) {
            rules.push(`${constraint.kind}:${constraint.value instanceof RegExp ? constraint.value.source : constraint.value}`);
        } else {
            rules.push(constraint.kind);
        }
    }
    return rules.join('|');
}
