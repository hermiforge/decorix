import type {ModelMetadata, ModelTarget, ValidatorAdapterRef} from '@hermiforge-decorix/core';

/**
 * Options used by the Modular Forms adapter.
 */
export type DecorixModularFormOptions = {
    initialValues?: Record<string, unknown>;
    validator?: ValidatorAdapterRef;
};

/**
 * Modular Forms' whole-form error shape: a single message per dot-path field
 * name, matching its `FormErrors<TFieldValues>` type
 * (`{[path]?: string | null | undefined}`).
 */
export type DecorixModularFormErrors = Record<string, string>;

/**
 * Modular Forms-oriented configuration generated from Decorix metadata.
 *
 * Passive by design, like the FormKit/Felte adapters: this does not call
 * `@modular-forms/solid`'s `createForm` itself, it only produces the
 * `initialValues` and `validate`/`validateAsync` functions a consumer passes
 * into `createForm({...})` as `FormOptions.validate`.
 */
export type DecorixModularFormConfig = {
    metadata: ModelMetadata;
    initialValues: Record<string, unknown>;
    validate: (values: unknown) => DecorixModularFormErrors;
    /** Async validation entry resolving async constraints; falls back to the sync result otherwise. */
    validateAsync: (values: unknown) => Promise<DecorixModularFormErrors>;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixModularFormModel = ModelTarget | ModelMetadata;
