import type {ModelTarget, ModelMetadata, ValidatorAdapterRef} from '@hermiforge-decorix/core';

/**
 * Options used by the Superforms validator adapter.
 */
export type DecorixSuperformsOptions<T = Record<string, unknown>> = {
    initialValues?: Partial<T>;
    validator?: ValidatorAdapterRef;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixSuperformsModel<T = Record<string, unknown>> = ModelTarget<T> | ModelMetadata;
