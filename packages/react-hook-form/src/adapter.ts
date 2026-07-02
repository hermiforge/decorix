import {createCoreValidatorAdapter, getModelMetadata, requireValidatorAdapter, runSchemaAsync} from '@decorix/core';
import {hookFormErrors} from './errors';
import type {
    DecorixReactHookFormConfig,
    DecorixReactHookFormModel,
    DecorixReactHookFormOptions
} from './types';
import type {FieldMetadata, ModelMetadata} from '@decorix/core';

/**
 * Creates React Hook Form configuration from Decorix metadata.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional default values and validator adapter.
 * @returns React Hook Form-oriented configuration and resolver.
 */
export function toReactHookForm(
    modelOrMetadata: DecorixReactHookFormModel,
    options: DecorixReactHookFormOptions = {}
): DecorixReactHookFormConfig {
    const metadata = getModelMetadata(modelOrMetadata);
    const schema = (options.validator === undefined ? createCoreValidatorAdapter() : requireValidatorAdapter(options.validator)).createSchema(metadata);

    return {
        metadata,
        defaultValues: defaults(metadata, options.defaultValues),
        fields: metadata.fields.map((field) => ({
            name: field.name,
            required: requiredRule(field),
            metadata: field
        })),
        async resolver(values) {
            // The resolver awaits the schema's async path so async constraints resolve before submit.
            const result = await runSchemaAsync(schema, values);
            if (result.success) {
                return {values: result.data, errors: {}};
            }

            return {values: {}, errors: hookFormErrors(result.issues)};
        }
    };
}

/**
 * Hook-shaped React Hook Form adapter factory.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional default values and validator adapter.
 * @returns React Hook Form-oriented configuration.
 */
export function useReactHookDecorix(
    modelOrMetadata: DecorixReactHookFormModel,
    options: DecorixReactHookFormOptions = {}
): DecorixReactHookFormConfig {
    return toReactHookForm(modelOrMetadata, options);
}

function defaults(metadata: ModelMetadata, provided: Record<string, unknown> = {}): Record<string, unknown> {
    return Object.fromEntries(metadata.fields.map((field) => [field.name, provided[field.name]]));
}

function requiredRule(field: FieldMetadata): boolean | string {
    const required = field.constraints.find((constraint) => constraint.name === 'required');
    return required?.message ?? field.required;
}


