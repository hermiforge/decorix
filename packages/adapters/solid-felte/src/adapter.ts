import {defaultValuesFor, getModelMetadata, resolveSchema, runSchemaAsync} from '@hermiforge-decorix/core';
import {felteErrors} from './errors';
import type {DecorixFelteConfig, DecorixFelteErrors, DecorixFelteModel, DecorixFelteOptions} from './types';

/**
 * Converts Decorix metadata or a registered model class into a Felte-oriented
 * form configuration (`initialValues` plus `validate`/`validateAsync`
 * functions, matching Felte's `ValidationFunction` return shape).
 *
 * Passive by design: this does not call `@felte/solid`'s `createForm` itself,
 * matching the FormKit/React Hook Form adapters — pass the returned
 * `initialValues` and `validate`/`validateAsync` straight into `createForm({...})`.
 */
export function toFelteForm<T = Record<string, unknown>>(
    modelOrMetadata: DecorixFelteModel<T>,
    options: DecorixFelteOptions<T> = {}
): DecorixFelteConfig<T> {
    const metadata = getModelMetadata(modelOrMetadata);
    const validatorSchema = resolveSchema(metadata, options.validator);

    return {
        metadata,
        initialValues: defaultValuesFor(metadata, options.initialValues as Record<string, unknown> | undefined) as Partial<T>,
        validate: (values: unknown): DecorixFelteErrors => {
            const result = validatorSchema.validate(values);
            return result.success ? {} : felteErrors(result.issues);
        },
        validateAsync: async (values: unknown): Promise<DecorixFelteErrors> => {
            const result = await runSchemaAsync(validatorSchema, values);
            return result.success ? {} : felteErrors(result.issues);
        }
    };
}

/** Alias matching Felte's own `createForm` naming convention. */
export function useFelteDecorix<T = Record<string, unknown>>(
    modelOrMetadata: DecorixFelteModel<T>,
    options: DecorixFelteOptions<T> = {}
): DecorixFelteConfig<T> {
    return toFelteForm(modelOrMetadata, options);
}
