import {createCoreValidatorAdapter, getModelMetadata, requireValidatorAdapter} from '@decorix/core';
import {DecorixValidationException} from './errors';
import type {DecorixPipeModel, DecorixPipeOptions, DecorixPipeTransform} from './types';

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

    return {
        transform(value: unknown): unknown {
            const result = schema.validate(value);
            if (result.success) {
                return result.data;
            }

            throw new DecorixValidationException(
                result.issues.map((issue) => ({path: issue.path, message: issue.message}))
            );
        }
    };
}


