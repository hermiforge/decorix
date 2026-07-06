import {groupIssuesByField} from '@hermiforge-decorix/core';
import type {ValidationIssue} from '@hermiforge-decorix/core';

/**
 * Converts Decorix issues into TanStack Form's field-keyed error message map
 * (one message per field, matching the `{fields: {name: string}}` shape
 * TanStack Form's `onSubmit`/`onSubmitAsync` validators expect).
 */
export function collectErrors(issues: ValidationIssue[]): Record<string, string> {
    const grouped = groupIssuesByField(issues, 'first');
    return Object.fromEntries(Object.entries(grouped).map(([key, [issue]]) => [key, issue.message]));
}