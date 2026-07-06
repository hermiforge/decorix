import type {FieldMetadata, ModelMetadata, ModelTarget, ValidatorAdapterRef} from '@decorix/core';

/**
 * Options used by the React Hook Form adapter.
 */
export type DecorixReactHookFormOptions = {
    defaultValues?: Record<string, unknown>;
    validator?: ValidatorAdapterRef;
};

/**
 * Field rule summary generated for React Hook Form.
 */
export type DecorixReactHookFieldRule = {
    name: string;
    required: boolean | string;
    metadata: FieldMetadata;
};

/**
 * React Hook Form-compatible field error.
 */
export type DecorixReactHookFieldError = {
    type?: string;
    message: string;
};

/**
 * React Hook Form-oriented configuration generated from Decorix metadata.
 */
export type DecorixReactHookFormConfig = {
    metadata: ModelMetadata;
    defaultValues: Record<string, unknown>;
    fields: DecorixReactHookFieldRule[];
    resolver(values: unknown): Promise<{ values: unknown; errors: Record<string, DecorixReactHookFieldError> }>;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixReactHookFormModel = ModelTarget | ModelMetadata;
