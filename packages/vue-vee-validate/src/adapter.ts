import {createCoreValidatorAdapter, getModelMetadata, requireValidatorAdapter, runSchemaAsync} from '@decorix/core';
import type {DecorixVeeValidateConfig, DecorixVeeValidateModel, DecorixVeeValidateOptions} from './types';
import type {ModelMetadata} from '@decorix/core';

/**
 * Creates VeeValidate configuration from Decorix metadata.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional initial values and validator adapter.
 * @returns VeeValidate-oriented configuration with a generic validation schema.
 */
export function toVeeValidate(
    modelOrMetadata: DecorixVeeValidateModel,
    options: DecorixVeeValidateOptions = {}
): DecorixVeeValidateConfig {
    const metadata = getModelMetadata(modelOrMetadata);
    const validationSchema = (options.validator === undefined ? createCoreValidatorAdapter() : requireValidatorAdapter(options.validator)).createSchema(metadata);

    return {
        metadata,
        initialValues: defaults(metadata, options.initialValues),
        validationSchema,
        fields: metadata.fields,
        validate: (value) => validationSchema.validate(value),
        validateAsync: (value) => runSchemaAsync(validationSchema, value)
    };
}

/**
 * Composition API-shaped VeeValidate adapter factory.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional initial values and validator adapter.
 * @returns VeeValidate-oriented configuration.
 */
export function useVeeDecorix(
    modelOrMetadata: DecorixVeeValidateModel,
    options: DecorixVeeValidateOptions = {}
): DecorixVeeValidateConfig {
    return toVeeValidate(modelOrMetadata, options);
}

function defaults(metadata: ModelMetadata, provided: Record<string, unknown> = {}): Record<string, unknown> {
    return Object.fromEntries(metadata.fields.map((field) => [field.name, provided[field.name]]));
}


