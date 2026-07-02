import type {ModelMetadata, ModelTarget, ValidatorAdapterRef} from '@decorix/core';

/**
 * Normalized validation issue returned by the Decorix Nest pipe.
 */
export type DecorixHttpValidationIssue = {
    path: Array<string | number>;
    message: string;
};

/**
 * Error response body produced when Decorix validation fails.
 */
export type DecorixHttpValidationError = {
    statusCode: 400;
    error: 'Bad Request';
    message: 'Validation failed';
    issues: DecorixHttpValidationIssue[];
};

/**
 * Minimal Nest-compatible pipe transform interface.
 *
 * `transform` returns a Promise when the validated model declares async
 * constraints; Nest awaits pipe results, so both shapes are supported.
 */
export type DecorixPipeTransform = {
    transform(value: unknown): unknown | Promise<unknown>;
};

/**
 * Options used when creating a Decorix Nest pipe.
 */
export type DecorixPipeOptions = {
    validator?: ValidatorAdapterRef;
};

/**
 * Registered model class or raw Decorix metadata accepted by the pipe.
 */
export type DecorixPipeModel = ModelTarget | ModelMetadata;
