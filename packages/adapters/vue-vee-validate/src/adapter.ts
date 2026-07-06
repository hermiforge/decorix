import {defaultValuesFor, getModelMetadata, resolveSchema, runSchemaAsync} from '@hermiforge-decorix/core';
import type {DecorixVeeValidateConfig, DecorixVeeValidateModel, DecorixVeeValidateOptions} from './types';
import type {ValidatorSchema} from '@hermiforge-decorix/core';

/**
 * Builds vee-validate's per-field validation function map: `{fieldName: (value) => true | string | Promise<...>}`,
 * the generic per-field format `useField`/`useForm` recognize natively (unlike Decorix's own `ValidatorSchema`).
 *
 * Cross-field constraints (e.g. `EqualsField`) are best-effort here: each field is validated against the last
 * known snapshot (`initialValues` merged with the field under test), not the live values of every other field,
 * since vee-validate calls each field's function independently.
 */
function buildFieldValidators(
    schema: ValidatorSchema,
    fieldNames: string[],
    snapshot: Record<string, unknown>
): Record<string, (value: unknown) => Promise<true | string>> {
    const validators: Record<string, (value: unknown) => Promise<true | string>> = {};
    for (const name of fieldNames) {
        validators[name] = async (value) => {
            const result = await runSchemaAsync(schema, {...snapshot, [name]: value});
            if (result.success) return true;
            const issue = result.issues.find((candidate) => candidate.path[0] === name);
            return issue ? issue.message : true;
        };
    }
    return validators;
}

/**
 * Creates VeeValidate configuration from Decorix metadata.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional initial values and validator adapter.
 * @returns VeeValidate-oriented configuration with a per-field validation schema.
 */
export function toVeeValidate(
    modelOrMetadata: DecorixVeeValidateModel,
    options: DecorixVeeValidateOptions = {}
): DecorixVeeValidateConfig {
    const metadata = getModelMetadata(modelOrMetadata);
    const schema = resolveSchema(metadata, options.validator);
    const initialValues = defaultValuesFor(metadata, options.initialValues);

    return {
        metadata,
        initialValues,
        validationSchema: buildFieldValidators(
            schema,
            metadata.fields.map((field) => field.name),
            initialValues
        ),
        fields: metadata.fields,
        validate: (value) => schema.validate(value),
        validateAsync: (value) => runSchemaAsync(schema, value)
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


