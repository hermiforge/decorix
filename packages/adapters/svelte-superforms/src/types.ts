import type {ModelTarget, ModelMetadata, ValidatorAdapterRef} from '@hermiforge-decorix/core';

/**
 * Options used by the Superforms validator adapter.
 */
export type DecorixSuperformsOptions = {
    initialValues?: Record<string, unknown>;
    validator?: ValidatorAdapterRef;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixSuperformsModel = ModelTarget | ModelMetadata;
