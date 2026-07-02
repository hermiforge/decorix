import {createCoreValidatorAdapter, getModelMetadata, hasAsyncConstraints, requireValidatorAdapter, runSchemaAsync} from '@decorix/core';
import {DecorixValidationException} from './errors';
import type {DecorixPipeModel, DecorixPipeOptions, DecorixPipeTransform} from './types';
import type {ValidationResult} from '@decorix/core';

/**
 * Creates a Nest-compatible validation pipe backed by a Decorix validator adapter.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional validator adapter. Falls back to the global default adapter.
 * @returns A pipe transform object that returns parsed data or throws a validation exception.
 */
export function DecorixPipe(
    modelOrMetadata: DecorixPipeModel,
    options: DecorixPipeOptions = {}
): DecorixPipeTransform {
    const metadata = getModelMetadata(modelOrMetadata);
    const schema = (options.validator === undefined ? createCoreValidatorAdapter() : requireValidatorAdapter(options.validator)).createSchema(metadata);
    // Models with async constraints validate on the async path Nest can await.
    const isAsync = hasAsyncConstraints(metadata);

    return {
        transform(value: unknown): unknown | Promise<unknown> {
            if (isAsync) {
                return runSchemaAsync(schema, value).then(unwrap);
            }
            return unwrap(schema.validate(value));
        }
    };
}

/** Returns validated data or throws a Nest-friendly validation exception. */
function unwrap(result: ValidationResult): unknown {
    if (result.success) {
        return result.data;
    }

    throw new DecorixValidationException(
        result.issues.map((issue) => ({path: issue.path, message: issue.message}))
    );
}


