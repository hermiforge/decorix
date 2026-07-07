import type {ModelMetadata, ModelTarget, ValidatorAdapterRef} from '@hermiforge-decorix/core';

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
 *
 * `T` is inferred from a decorated class passed to {@link DecorixPipeModel}
 * (e.g. `DecorixPipe(SignupDto)` infers `T = SignupDto`), so a controller
 * handler parameter typed `@Body(DecorixPipe(SignupDto)) body: SignupDto`
 * matches `transform`'s real return type — no cast needed.
 */
export type DecorixPipeTransform<T = Record<string, unknown>> = {
    transform(value: unknown): T | Promise<T>;
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
export type DecorixPipeModel<T = Record<string, unknown>> = ModelTarget<T> | ModelMetadata;
