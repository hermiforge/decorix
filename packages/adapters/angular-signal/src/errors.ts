import {groupIssuesByField} from '@decorix/core';
import type {ValidationIssue, ValidationResult} from '@decorix/core';

/**
 * Converts Decorix validation output into a field-keyed signal form error map.
 */
export function collectErrors(result: ValidationResult): Record<string, string[]> {
    if (result.success) {
        return {};
    }

    const grouped = groupIssuesByField(result.issues);
    return Object.fromEntries(Object.entries(grouped).map(([key, fieldIssues]) => [key, fieldIssues.map((issue) => issue.message)]));
}

/**
 * Reads messages for one field from Decorix validation output.
 */
export function fieldErrors(result: ValidationResult, name: string): string[] {
    return collectErrors(result)[name] ?? [];
}

/**
 * Returns the normalized issue list from Decorix validation output.
 */
export function issues(result: ValidationResult): ValidationIssue[] {
    return result.success ? [] : result.issues;
}