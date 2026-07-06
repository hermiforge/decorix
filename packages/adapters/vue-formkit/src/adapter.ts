import {defaultValuesFor, getModelMetadata, resolveSchema, runSchemaAsync} from '@hermiforge-decorix/core';
import {formKitType, formKitValidation} from './validation';
import type {DecorixFormKitConfig, DecorixFormKitModel, DecorixFormKitOptions} from './types';
import type {FieldMetadata} from '@hermiforge-decorix/core';

/**
 * Creates FormKit schema configuration from Decorix metadata.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional initial values and validator adapter.
 * @returns FormKit-oriented field schema.
 */
export function toFormKit(
    modelOrMetadata: DecorixFormKitModel,
    options: DecorixFormKitOptions = {}
): DecorixFormKitConfig {
    const metadata = getModelMetadata(modelOrMetadata);
    const validatorSchema = resolveSchema(metadata, options.validator);

    return {
        metadata,
        initialValues: defaultValuesFor(metadata, options.initialValues),
        schema: metadata.fields.map(toFieldSchema),
        validate: (value: unknown) => validatorSchema.validate(value),
        validateAsync: (value: unknown) => runSchemaAsync(validatorSchema, value)
    };
}

/**
 * Composition API-shaped FormKit adapter factory.
 *
 * @param modelOrMetadata - Registered Decorix model target or raw metadata.
 * @param options - Optional initial values and validator adapter.
 * @returns FormKit-oriented field schema.
 */
export function useFormKitDecorix(
    modelOrMetadata: DecorixFormKitModel,
    options: DecorixFormKitOptions = {}
): DecorixFormKitConfig {
    return toFormKit(modelOrMetadata, options);
}

function toFieldSchema(field: FieldMetadata) {
    return {
        $formkit: formKitType(field),
        name: field.name,
        label: field.ui?.label,
        placeholder: field.ui?.placeholder,
        help: field.ui?.description,
        validation: formKitValidation(field),
        options: field.enumValues?.map((value) => ({label: value, value})),
        metadata: field
    };
}

