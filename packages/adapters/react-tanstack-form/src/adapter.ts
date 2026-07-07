import {defaultValuesFor, getModelMetadata, resolveSchema, runSchemaAsync} from '@hermiforge-decorix/core';
import {collectErrors} from './errors';
import type {DecorixTanStackFormConfig, DecorixTanStackFormModel, DecorixTanStackFormOptions} from './types';

/**
 * Creates TanStack Form configuration from Decorix metadata.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional default values and validator adapter.
 * @returns TanStack Form-oriented defaults and submit validator.
 */
export function toTanStackForm<T = Record<string, unknown>>(
    modelOrMetadata: DecorixTanStackFormModel<T>,
    options: DecorixTanStackFormOptions<T> = {}
): DecorixTanStackFormConfig<T> {
    const metadata = getModelMetadata(modelOrMetadata);
    const schema = resolveSchema(metadata, options.validator);

    return {
        metadata,
        defaultValues: defaultValuesFor(metadata, options.defaultValues as Record<string, unknown> | undefined) as Partial<T>,
        validators: {
            // TanStack Form calls form-level validators with a context object
            // (`{value, ...}`), not the raw values — destructuring `value` here
            // is required, not cosmetic. The return must be wrapped in `{fields}`
            // (or `undefined`/`null` when valid); a bare error map is not a
            // shape TanStack Form recognizes.
            onSubmit({value}) {
                const result = schema.validate(value);
                return result.success ? undefined : {fields: collectErrors(result.issues)};
            },
            async onSubmitAsync({value}) {
                // The async submit path resolves async constraints before reporting errors.
                const result = await runSchemaAsync(schema, value);
                return result.success ? undefined : {fields: collectErrors(result.issues)};
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
export function useTanStackDecorix<T = Record<string, unknown>>(
    modelOrMetadata: DecorixTanStackFormModel<T>,
    options: DecorixTanStackFormOptions<T> = {}
): DecorixTanStackFormConfig<T> {
    return toTanStackForm(modelOrMetadata, options);
}


