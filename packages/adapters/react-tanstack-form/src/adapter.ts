import {createCoreValidatorAdapter, getModelMetadata, requireValidatorAdapter, runSchemaAsync} from '@decorix/core';
import {collectErrors} from './errors';
import type {DecorixTanStackFormConfig, DecorixTanStackFormModel, DecorixTanStackFormOptions} from './types';
import type {ModelMetadata} from '@decorix/core';

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
    const schema = (options.validator === undefined ? createCoreValidatorAdapter() : requireValidatorAdapter(options.validator)).createSchema(metadata);

    return {
        metadata,
        defaultValues: defaults(metadata, options.defaultValues),
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

function defaults(metadata: ModelMetadata, provided: Record<string, unknown> = {}): Record<string, unknown> {
    return Object.fromEntries(metadata.fields.map((field) => [field.name, provided[field.name]]));
}


