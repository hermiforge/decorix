import type {ValidationIssue} from '@hermiforge-decorix/core';
import type {DecorixModularFormErrors} from './types';

/**
 * Converts Decorix issues into Modular Forms' whole-form error shape.
 *
 * Unlike `groupIssuesByField` (which only groups by the first path segment),
 * Modular Forms keys errors by the field's full dot-path (e.g. `address.city`,
 * `items.0.name`), matching its `FieldPath`/`FieldArrayPath` convention — and
 * keeps a single message per field, matching `FormErrors`'s `string`
 * (not `string[]`) value type. The first issue for a given path wins.
 */
export function modularFormErrors(issues: ValidationIssue[]): DecorixModularFormErrors {
    const errors: DecorixModularFormErrors = {};
    for (const issue of issues) {
        const key = issue.path.length ? issue.path.join('.') : '$root';
        if (!(key in errors)) errors[key] = issue.message;
    }
    return errors;
}
