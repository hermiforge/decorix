import {defaultValuesFor, getModelMetadata, resolveSchema, runSchemaAsync} from '@hermiforge-decorix/core';
import type {DecorixVeeValidateConfig, DecorixVeeValidateModel, DecorixVeeValidateOptions} from './types';

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
    const validationSchema = resolveSchema(metadata, options.validator);

    return {
        metadata,
        initialValues: defaultValuesFor(metadata, options.initialValues),
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


