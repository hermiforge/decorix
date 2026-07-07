import {defaultValuesFor, getModelMetadata, resolveSchema, runSchemaAsync} from '@hermiforge-decorix/core';
import {modularFormErrors} from './errors';
import type {DecorixModularFormConfig, DecorixModularFormErrors, DecorixModularFormModel, DecorixModularFormOptions} from './types';

/**
 * Converts Decorix metadata or a registered model class into a Modular
 * Forms-oriented configuration (`initialValues` plus `validate`/`validateAsync`
 * functions matching Modular Forms' `ValidateForm` shape:
 * `(values) => MaybePromise<FormErrors>`).
 *
 * Passive by design: this does not call `@modular-forms/solid`'s `createForm`
 * itself, matching the FormKit/Felte adapters — pass the returned
 * `initialValues` and `validate`/`validateAsync` into
 * `createForm({..., validate: ...})`.
 */
export function toModularForm(modelOrMetadata: DecorixModularFormModel, options: DecorixModularFormOptions = {}): DecorixModularFormConfig {
    const metadata = getModelMetadata(modelOrMetadata);
    const validatorSchema = resolveSchema(metadata, options.validator);

    return {
        metadata,
        initialValues: defaultValuesFor(metadata, options.initialValues),
        validate: (values: unknown): DecorixModularFormErrors => {
            const result = validatorSchema.validate(values);
            return result.success ? {} : modularFormErrors(result.issues);
        },
        validateAsync: async (values: unknown): Promise<DecorixModularFormErrors> => {
            const result = await runSchemaAsync(validatorSchema, values);
            return result.success ? {} : modularFormErrors(result.issues);
        }
    };
}

/** Alias matching Modular Forms' own `createForm` naming convention. */
export function useModularFormDecorix(modelOrMetadata: DecorixModularFormModel, options: DecorixModularFormOptions = {}): DecorixModularFormConfig {
    return toModularForm(modelOrMetadata, options);
}
