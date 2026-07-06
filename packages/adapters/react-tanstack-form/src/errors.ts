import {groupIssuesByField} from '@decorix/core';
import type {ValidationIssue} from '@decorix/core';

/**
 * Converts Decorix issues into TanStack Form's field-keyed message map.
 */
export function collectErrors(issues: ValidationIssue[]): Record<string, string[]> {
    const grouped = groupIssuesByField(issues);
    return Object.fromEntries(Object.entries(grouped).map(([key, fieldIssues]) => [key, fieldIssues.map((issue) => issue.message)]));
}