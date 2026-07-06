import {groupIssuesByField} from '@decorix/core';
import type {ValidationIssue} from '@decorix/core';
import type {DecorixReactHookFieldError} from './types';

/**
 * Converts Decorix issues into React Hook Form's field-keyed error map.
 *
 * React Hook Form expects one primary error per field, so the first issue per field wins.
 */
export function hookFormErrors(issues: ValidationIssue[]): Record<string, DecorixReactHookFieldError> {
    const grouped = groupIssuesByField(issues, 'first');
    return Object.fromEntries(
        Object.entries(grouped).map(([key, [issue]]) => [key, {type: issue.code, message: issue.message}])
    );
}