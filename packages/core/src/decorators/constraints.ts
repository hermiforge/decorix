import {upsertConstraintMetadata} from '../metadata/constraints';
import {fieldDecorator} from './common';

/**
 * Marks a field as required.
 *
 * @param message - Optional validation message used by adapters.
 * @returns A property decorator.
 */
export function Required(message?: string): PropertyDecorator {
    return fieldDecorator((field) => {
        field.required = true;
        upsertConstraintMetadata(field, {kind: 'required', message});
    });
}

/**
 * Adds a minimum string length constraint.
 *
 * @param value - Inclusive minimum string length.
 * @param message - Optional validation message used by adapters.
 * @returns A property decorator.
 */
export function MinLength(value: number, message?: string): PropertyDecorator {
    return fieldDecorator((field) => {
        field.type = 'string';
        upsertConstraintMetadata(field, {kind: 'minLength', value, message});
    });
}

/**
 * Adds a maximum string length constraint.
 *
 * @param value - Inclusive maximum string length.
 * @param message - Optional validation message used by adapters.
 * @returns A property decorator.
 */
export function MaxLength(value: number, message?: string): PropertyDecorator {
    return fieldDecorator((field) => {
        field.type = 'string';
        upsertConstraintMetadata(field, {kind: 'maxLength', value, message});
    });
}

/**
 * Adds an email format constraint.
 *
 * @param message - Optional validation message used by adapters.
 * @returns A property decorator.
 */
export function Email(message?: string): PropertyDecorator {
    return fieldDecorator((field) => {
        field.type = 'string';
        upsertConstraintMetadata(field, {kind: 'email', message});
    });
}

/**
 * Adds a regular expression string constraint.
 *
 * @param value - Pattern that values must match.
 * @param message - Optional validation message used by adapters.
 * @returns A property decorator.
 */
export function Pattern(value: RegExp, message?: string): PropertyDecorator {
    return fieldDecorator((field) => {
        field.type = 'string';
        upsertConstraintMetadata(field, {kind: 'pattern', value, message});
    });
}

/**
 * Adds a minimum numeric value constraint.
 *
 * @param value - Inclusive minimum number.
 * @param message - Optional validation message used by adapters.
 * @returns A property decorator.
 */
export function Min(value: number, message?: string): PropertyDecorator {
    return fieldDecorator((field) => {
        field.type = 'number';
        upsertConstraintMetadata(field, {kind: 'min', value, message});
    });
}

/**
 * Adds a maximum numeric value constraint.
 *
 * @param value - Inclusive maximum number.
 * @param message - Optional validation message used by adapters.
 * @returns A property decorator.
 */
export function Max(value: number, message?: string): PropertyDecorator {
    return fieldDecorator((field) => {
        field.type = 'number';
        upsertConstraintMetadata(field, {kind: 'max', value, message});
    });
}
