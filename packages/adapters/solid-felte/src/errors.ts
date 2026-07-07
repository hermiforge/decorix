import {groupIssuesByField} from '@hermiforge-decorix/core';
import type {ValidationIssue} from '@hermiforge-decorix/core';
import type {DecorixFelteErrors} from './types';

/**
 * Converts Decorix issues into Felte's per-field error shape.
 *
 * Felte accepts a single message or an array of messages per field, so every
 * issue for a field is kept (unlike React Hook Form's single-error convention).
 */
export function felteErrors(issues: ValidationIssue[]): DecorixFelteErrors {
    const grouped = groupIssuesByField(issues, 'all');
    return Object.fromEntries(
        Object.entries(grouped).map(([key, fieldIssues]) => [key, fieldIssues.map((issue) => issue.message)])
    );
}
