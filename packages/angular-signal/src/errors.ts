import type {ValidationIssue, ValidationResult} from '@decorix/core';

export function collectErrors(result: ValidationResult): Record<string, string[]> {
    if (result.success) {
        return {};
    }

    const errors: Record<string, string[]> = {};
    for (const issue of result.issues) {
        const key = String(issue.path[0] ?? '$root');
        errors[key] = [...(errors[key] ?? []), issue.message];
    }
    return errors;
}

export function fieldErrors(result: ValidationResult, name: string): string[] {
    return collectErrors(result)[name] ?? [];
}

export function issues(result: ValidationResult): ValidationIssue[] {
    return result.success ? [] : result.issues;
}
