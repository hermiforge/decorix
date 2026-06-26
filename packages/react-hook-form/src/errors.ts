import type {ValidationIssue} from '@decorix/core';
import type {DecorixReactHookFieldError} from './types';

export function hookFormErrors(issues: ValidationIssue[]): Record<string, DecorixReactHookFieldError> {
    const errors: Record<string, DecorixReactHookFieldError> = {};
    for (const issue of issues) {
        const key = String(issue.path[0] ?? '$root');
        errors[key] ??= {type: issue.code, message: issue.message};
    }
    return errors;
}
