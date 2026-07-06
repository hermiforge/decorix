import type {ValidationIssue} from '@decorix/core';
import type {DecorixReactHookFieldError} from './types';

/**
 * Converts Decorix issues into React Hook Form's field-keyed error map.
 */
export function hookFormErrors(issues: ValidationIssue[]): Record<string, DecorixReactHookFieldError> {
    const errors: Record<string, DecorixReactHookFieldError> = {};
    for (const issue of issues) {
        const key = String(issue.path[0] ?? '$root');
        // React Hook Form expects one primary error per field, so the first issue wins.
        errors[key] ??= {type: issue.code, message: issue.message};
    }
    return errors;
}