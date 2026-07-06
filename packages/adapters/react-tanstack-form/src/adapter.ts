import {defaultValuesFor, getModelMetadata, resolveSchema, runSchemaAsync} from '@decorix/core';
import {collectErrors} from './errors';
import type {DecorixTanStackFormConfig, DecorixTanStackFormModel, DecorixTanStackFormOptions} from './types';

/**
 * Creates TanStack Form configuration from Decorix metadata.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional default values and validator adapter.
 * @returns TanStack Form-oriented defaults and submit validator.
 */
export function toTanStackForm(
    modelOrMetadata: DecorixTanStackFormModel,
    options: DecorixTanStackFormOptions = {}
): DecorixTanStackFormConfig {
    const metadata = getModelMetadata(modelOrMetadata);
    const schema = resolveSchema(metadata, options.validator);

    return {
        metadata,
        defaultValues: defaultValuesFor(metadata, options.defaultValues),
        validators: {
            onSubmit(value) {
                const result = schema.validate(value);
                return result.success ? undefined : collectErrors(result.issues);
            },
            async onSubmitAsync(value) {
                // The async submit path resolves async constraints before reporting errors.
                const result = await runSchemaAsync(schema, value);
                return result.success ? undefined : collectErrors(result.issues);
            }
        }
    };
}

/**
 * Hook-shaped TanStack Form adapter factory.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional default values and validator adapter.
 * @returns TanStack Form-oriented configuration.
 */
export function useTanStackDecorix(
    modelOrMetadata: DecorixTanStackFormModel,
    options: DecorixTanStackFormOptions = {}
): DecorixTanStackFormConfig {
    return toTanStackForm(modelOrMetadata, options);
}


