import type {ModelMetadata, ModelTarget, ValidatorAdapterRef} from '@hermiforge-decorix/core';

/**
 * Options used by the Felte adapter.
 */
export type DecorixFelteOptions<T = Record<string, unknown>> = {
    initialValues?: Partial<T>;
    validator?: ValidatorAdapterRef;
};

/**
 * Felte-native per-field error shape: a message or a list of messages,
 * matching Felte's `ValidationFunction` return type.
 */
export type DecorixFelteErrors = Record<string, string | string[]>;

/**
 * Felte-oriented configuration generated from Decorix metadata.
 *
 * Passive by design, like the FormKit/React Hook Form adapters: this does not
 * call Felte's `createForm` itself, it only produces the `initialValues` and
 * `validate`/`validateAsync` functions a consumer passes into `createForm`.
 *
 * `T` is inferred from a decorated class passed to {@link DecorixFelteModel}
 * (e.g. `toFelteForm(SignupDto)` infers `T = SignupDto`), so `initialValues`
 * is already typed — no separate form-values type or cast needed.
 */
export type DecorixFelteConfig<T = Record<string, unknown>> = {
    metadata: ModelMetadata;
    initialValues: Partial<T>;
    validate: (values: unknown) => DecorixFelteErrors;
    /** Async validation entry resolving async constraints; falls back to the sync result otherwise. */
    validateAsync: (values: unknown) => Promise<DecorixFelteErrors>;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixFelteModel<T = Record<string, unknown>> = ModelTarget<T> | ModelMetadata;
