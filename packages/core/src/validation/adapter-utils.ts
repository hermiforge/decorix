import type {ModelMetadata} from '../metadata/types';
import {createCoreValidatorAdapter} from './core-adapter';
import {requireValidatorAdapter} from './registry';
import type {ValidationIssue, ValidatorAdapterRef, ValidatorSchema} from './types';

/**
 * Resolves the validator schema an adapter should use: an explicit adapter
 * reference when provided, otherwise the core validator facade.
 *
 * Shared by every UI adapter that accepts an `options.validator` override
 * (React Hook Form, TanStack Form, VeeValidate, FormKit, Nest, Angular Signal Forms).
 */
export function resolveSchema(metadata: ModelMetadata, validator?: ValidatorAdapterRef): ValidatorSchema {
    return (validator === undefined ? createCoreValidatorAdapter() : requireValidatorAdapter(validator)).createSchema(metadata);
}

/**
 * Builds a fully-keyed default values object for a form-oriented adapter:
 * every model field gets an entry, falling back to `undefined` when absent from `provided`.
 */
export function defaultValuesFor(metadata: ModelMetadata, provided: Record<string, unknown> = {}): Record<string, unknown> {
    return Object.fromEntries(metadata.fields.map((field) => [field.name, provided[field.name]]));
}

/**
 * Groups validation issues by their first path segment, falling back to `$root`
 * for object-level issues with an empty path.
 *
 * @param mode - `'first'` keeps only the first issue per field (single-error
 * adapters like React Hook Form); `'all'` accumulates every issue per field.
 */
export function groupIssuesByField(issues: ValidationIssue[], mode: 'first' | 'all' = 'all'): Record<string, ValidationIssue[]> {
    const grouped: Record<string, ValidationIssue[]> = {};
    for (const issue of issues) {
        const key = String(issue.path[0] ?? '$root');
        if (mode === 'first' && grouped[key]) continue;
        grouped[key] = [...(grouped[key] ?? []), issue];
    }
    return grouped;
}
