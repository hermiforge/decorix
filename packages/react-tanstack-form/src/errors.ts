import type {ValidationIssue} from '@decorix/core';

export function collectErrors(issues: ValidationIssue[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const issue of issues) {
        const key = String(issue.path[0] ?? '$root');
        errors[key] = [...(errors[key] ?? []), issue.message];
    }
    return errors;
}
