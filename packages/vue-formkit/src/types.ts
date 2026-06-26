import type {FieldMetadata, ModelMetadata, ModelTarget, ValidationResult, ValidatorAdapterRef} from '@decorix/core';

/**
 * Options used by the FormKit adapter.
 */
export type DecorixFormKitOptions = {
    initialValues?: Record<string, unknown>;
    validator?: ValidatorAdapterRef;
};

/**
 * Select option generated for enum fields.
 */
export type DecorixFormKitOption = {
    label: string;
    value: string;
};

/**
 * FormKit field node generated from Decorix metadata.
 */
export type DecorixFormKitField = {
    $formkit: string;
    name: string;
    label?: string;
    placeholder?: string;
    help?: string;
    validation: string;
    options?: DecorixFormKitOption[];
    metadata: FieldMetadata;
};

/**
 * FormKit-oriented schema generated from Decorix metadata.
 */
export type DecorixFormKitConfig = {
    metadata: ModelMetadata;
    initialValues: Record<string, unknown>;
    schema: DecorixFormKitField[];
    validate?: (value: unknown) => ValidationResult;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixFormKitModel = ModelTarget | ModelMetadata;
