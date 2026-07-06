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
 * Converts Decorix constraints into FormKit's pipe-delimited validation string, using FormKit's own
 * rule vocabulary (`required`, `email`, `url`, `min`, `max`, `length`, `matches`) rather than Decorix's
 * internal constraint names — FormKit silently ignores rule names it doesn't recognize.
 *
 * Constraints without a native FormKit equivalent (e.g. `slug`, `integer`, `past`, `future`,
 * `equalsField`) are omitted from this string; they remain enforced via `config.validate()` /
 * `config.validateAsync()`, just not surfaced inline by FormKit itself.
 */
export function formKitValidation(field: FieldMetadata): string {
    const rules = field.required ? ['required'] : [];
    let minLength: number | undefined;
    let maxLength: number | undefined;

    for (const constraint of field.constraints) {
        switch (constraint.name) {
            case 'required':
                break;
            case 'minLength':
                minLength = constraint.options as number;
                break;
            case 'maxLength':
                maxLength = constraint.options as number;
                break;
            case 'length': {
                const {min, max} = constraint.options as {min: number; max: number};
                rules.push(`length:${min},${max}`);
                break;
            }
            case 'pattern': {
                const pattern = constraint.options as RegExp;
                rules.push(`matches:/${pattern.source}/`);
                break;
            }
            case 'email':
                rules.push('email');
                break;
            case 'url':
                rules.push('url');
                break;
            case 'min':
                rules.push(`min:${constraint.options as number}`);
                break;
            case 'max':
                rules.push(`max:${constraint.options as number}`);
                break;
            default:
                break;
        }
    }

    if (minLength !== undefined || maxLength !== undefined) {
        const lengthArgs = maxLength !== undefined ? `${minLength ?? 0},${maxLength}` : `${minLength ?? 0}`;
        rules.push(`length:${lengthArgs}`);
    }

    return rules.join('|');
}