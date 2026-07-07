import {getModelMetadata, hasAsyncConstraints, resolveSchema, runSchemaAsync} from '@hermiforge-decorix/core';
import {DecorixValidationException} from './errors';
import type {DecorixPipeModel, DecorixPipeOptions, DecorixPipeTransform} from './types';
import type {ValidationResult} from '@hermiforge-decorix/core';

/**
 * Creates a Nest-compatible validation pipe backed by a Decorix validator adapter.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional validator adapter. Falls back to the global default adapter.
 * @returns A pipe transform object that returns parsed data or throws a validation exception.
 */
export function DecorixPipe<T = Record<string, unknown>>(
    modelOrMetadata: DecorixPipeModel<T>,
    options: DecorixPipeOptions = {}
): DecorixPipeTransform<T> {
    const metadata = getModelMetadata(modelOrMetadata);
    const schema = resolveSchema(metadata, options.validator);
    // Models with async constraints validate on the async path Nest can await.
    const isAsync = hasAsyncConstraints(metadata);

    return {
        transform(value: unknown): T | Promise<T> {
            if (isAsync) {
                return runSchemaAsync(schema, value).then(unwrap<T>);
            }
            return unwrap<T>(schema.validate(value));
        }
    };
}

/** Returns validated data or throws a Nest-friendly validation exception. */
function unwrap<T>(result: ValidationResult): T {
    if (result.success) {
        return result.data as T;
    }

    throw new DecorixValidationException(
        result.issues.map((issue) => ({path: issue.path, message: issue.message}))
    );
}


