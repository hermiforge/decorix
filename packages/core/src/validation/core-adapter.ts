import type {ValidationOptions, ValidationResult, ValidatorAdapter, ValidatorSchema} from './types';
import type {ModelMetadata} from '../metadata/types';
import {validate, validateAsync} from './engine';

/** Validator schema implemented directly by the Decorix core validation engine. */
export type CoreValidatorSchema = ValidatorSchema;

/**
 * Creates a framework-neutral validator adapter backed by Decorix core validation.
 *
 * @param name - Adapter registry name.
 * @returns Validator adapter that enforces every registered synchronous constraint.
 */
export function createCoreValidatorAdapter(name = 'core'): ValidatorAdapter<CoreValidatorSchema> {
    return {
        name,
        createSchema(metadata: ModelMetadata): CoreValidatorSchema {
            return {
                validate(value, options) {
                    // Core validation is the canonical fallback for adapters without native coverage.
                    return validate(value, metadata, options);
                },
                validateAsync(value, options) {
                    // The async path resolves async constraints the sync path would reject.
                    return validateAsync(value, metadata, options);
                }
            };
        }
    };
}

/**
 * Validates a value against a schema, preferring its async path when available.
 *
 * Adapters call this to support async constraints uniformly: schemas exposing
 * {@link ValidatorSchema.validateAsync} run it, otherwise the sync result is
 * wrapped in a resolved Promise.
 *
 * @param schema - Validator schema to run.
 * @param value - Value to validate.
 * @param options - Optional group, locale, service, and registry controls.
 * @returns Promise of the normalized validation result.
 */
export function runSchemaAsync<TValue = unknown>(
    schema: ValidatorSchema<TValue>,
    value: unknown,
    options?: ValidationOptions
): Promise<ValidationResult<TValue>> {
    return schema.validateAsync ? schema.validateAsync(value, options) : Promise.resolve(schema.validate(value, options));
}
