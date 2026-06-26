import type {UiMetadata} from '../metadata/types';
import {fieldDecorator} from './common';

/**
 * Sets a display label for a field.
 *
 * @param value - Human-readable field label.
 * @returns A property decorator.
 */
export function Label(value: string): PropertyDecorator {
    return uiDecorator({label: value});
}

/**
 * Sets placeholder text for a field.
 *
 * @param value - Placeholder text.
 * @returns A property decorator.
 */
export function Placeholder(value: string): PropertyDecorator {
    return uiDecorator({placeholder: value});
}

/**
 * Sets descriptive helper text for a field.
 *
 * @param value - Field description.
 * @returns A property decorator.
 */
export function Description(value: string): PropertyDecorator {
    return uiDecorator({description: value});
}

/**
 * Marks a field as hidden in generated UI surfaces.
 *
 * @param value - Whether the field should be hidden. Defaults to true.
 * @returns A property decorator.
 */
export function Hidden(value = true): PropertyDecorator {
    return uiDecorator({hidden: value});
}

/**
 * Marks a field as read-only in generated UI surfaces.
 *
 * @param value - Whether the field should be read-only. Defaults to true.
 * @returns A property decorator.
 */
export function Readonly(value = true): PropertyDecorator {
    return uiDecorator({readonly: value});
}

/**
 * Sets relative field ordering for generated UI surfaces.
 *
 * @param value - Numeric sort order.
 * @returns A property decorator.
 */
export function Order(value: number): PropertyDecorator {
    return uiDecorator({order: value});
}

/**
 * Assigns a field to a named UI group.
 *
 * @param value - Group identifier.
 * @returns A property decorator.
 */
export function Group(value: string): PropertyDecorator {
    return uiDecorator({group: value});
}

function uiDecorator(ui: UiMetadata): PropertyDecorator {
    return fieldDecorator((field) => {
        field.ui = {...field.ui, ...ui};
    });
}
