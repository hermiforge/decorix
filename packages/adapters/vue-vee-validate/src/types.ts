import type {FieldMetadata, ModelMetadata, ModelTarget, ValidationResult, ValidatorAdapterRef} from '@hermiforge-decorix/core';

/**
 * Options used by the VeeValidate adapter.
 */
export type DecorixVeeValidateOptions = {
    initialValues?: Record<string, unknown>;
    validator?: ValidatorAdapterRef;
};

/**
 * Per-field validation function map, the generic `validationSchema` shape
 * `useForm`/`useField` recognize natively: `true` when valid, otherwise the
 * error message (sync or resolved via a Promise).
 */
export type DecorixVeeValidateFieldSchema = Record<string, (value: unknown) => Promise<true | string>>;

/**
 * VeeValidate-oriented configuration generated from Decorix metadata.
 */
export type DecorixVeeValidateConfig = {
    metadata: ModelMetadata;
    initialValues: Record<string, unknown>;
    validationSchema: DecorixVeeValidateFieldSchema;
    fields: FieldMetadata[];
    validate(value: unknown): ValidationResult;
    /** Async validation entry resolving async constraints; falls back to the sync result otherwise. */
    validateAsync(value: unknown): Promise<ValidationResult>;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixVeeValidateModel = ModelTarget | ModelMetadata;
