import type {DecorixHttpValidationError, DecorixHttpValidationIssue} from './types';

/**
 * Error thrown by DecorixPipe when validation fails.
 */
export class DecorixValidationException extends Error {
    /** HTTP response body associated with this validation error. */
    readonly response: DecorixHttpValidationError;

    /** HTTP status code associated with this validation error. */
    readonly status = 400;

    /**
     * Creates a validation exception from normalized issues.
     *
     * @param issues - Field-level validation issues.
     */
    constructor(issues: DecorixHttpValidationIssue[]) {
        super('Validation failed');
        this.name = 'DecorixValidationException';
        this.response = {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Validation failed',
            issues
        };
    }

    /**
     * Returns the Nest-style response body.
     *
     * @returns Normalized HTTP validation response.
     */
    getResponse(): DecorixHttpValidationError {
        return this.response;
    }

    /**
     * Returns the HTTP status code.
     *
     * @returns The status code 400.
     */
    getStatus(): number {
        return this.status;
    }
}
