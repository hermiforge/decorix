import {defaultValuesFor, getModelMetadata, resolveSchema, runSchemaAsync} from '@hermiforge-decorix/core';
import {hookFormErrors} from './errors';
import type {
    DecorixReactHookFormConfig,
    DecorixReactHookFormModel,
    DecorixReactHookFormOptions
} from './types';
import type {FieldMetadata} from '@hermiforge-decorix/core';

/**
 * Creates React Hook Form configuration from Decorix metadata.
 *
 * Passing a decorated class directly (`toReactHookForm(SignupDto)`) infers
 * `T = SignupDto` — `defaultValues`/`resolver` come back already typed for
 * `useForm<SignupDto>`, no separate form-values type or cast needed.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional default values and validator adapter.
 * @returns React Hook Form-oriented configuration and resolver.
 */
export function toReactHookForm<T = Record<string, unknown>>(
    modelOrMetadata: DecorixReactHookFormModel<T>,
    options: DecorixReactHookFormOptions<T> = {}
): DecorixReactHookFormConfig<T> {
    const metadata = getModelMetadata(modelOrMetadata);
    const schema = resolveSchema(metadata, options.validator);

    return {
        metadata,
        defaultValues: defaultValuesFor(metadata, options.defaultValues as Record<string, unknown> | undefined) as Partial<T>,
        fields: metadata.fields.map((field) => ({
            name: field.name as Extract<keyof T, string>,
            required: requiredRule(field),
            metadata: field
        })),
        async resolver(values) {
            // The resolver awaits the schema's async path so async constraints resolve before submit.
            const result = await runSchemaAsync(schema, values);
            if (result.success) {
                return {values: result.data as T, errors: {}};
            }

            return {values: {} as T, errors: hookFormErrors(result.issues)};
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
export function useReactHookDecorix<T = Record<string, unknown>>(
    modelOrMetadata: DecorixReactHookFormModel<T>,
    options: DecorixReactHookFormOptions<T> = {}
): DecorixReactHookFormConfig<T> {
    return toReactHookForm(modelOrMetadata, options);
}

function requiredRule(field: FieldMetadata): boolean | string {
    const required = field.constraints.find((constraint) => constraint.name === 'required');
    return required?.message ?? field.required;
}


