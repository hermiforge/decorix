import type {ModelMetadata, ModelTarget, ValidatorAdapterRef} from '@decorix/core';

/**
 * Options used by the TanStack Form adapter.
 */
export type DecorixTanStackFormOptions = {
    defaultValues?: Record<string, unknown>;
    validator?: ValidatorAdapterRef;
};

/**
 * TanStack Form-oriented configuration generated from Decorix metadata.
 */
export type DecorixTanStackFormConfig = {
    metadata: ModelMetadata;
    defaultValues: Record<string, unknown>;
    validators: {
        onSubmit(value: unknown): undefined | Record<string, string[]>;
    };
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixTanStackFormModel = ModelTarget | ModelMetadata;
