import type {FieldMetadata, ModelMetadata, ModelTarget, ValidationResult, ValidatorAdapterRef, ValidatorSchema} from '@decorix/core';

/**
 * Options used by the VeeValidate adapter.
 */
export type DecorixVeeValidateOptions = {
    initialValues?: Record<string, unknown>;
    validator?: ValidatorAdapterRef;
};

/**
 * VeeValidate-oriented configuration generated from Decorix metadata.
 */
export type DecorixVeeValidateConfig = {
    metadata: ModelMetadata;
    initialValues: Record<string, unknown>;
    validationSchema: ValidatorSchema;
    fields: FieldMetadata[];
    validate(value: unknown): ValidationResult;
    /** Async validation entry resolving async constraints; falls back to the sync result otherwise. */
    validateAsync(value: unknown): Promise<ValidationResult>;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixVeeValidateModel = ModelTarget | ModelMetadata;
