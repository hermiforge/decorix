import type {FieldMetadata, ModelMetadata, ModelTarget, ValidationResult, ValidatorAdapterRef} from '@hermiforge-decorix/core';

/**
 * Options used by the VeeValidate adapter.
 */
export type DecorixVeeValidateOptions<T = Record<string, unknown>> = {
    initialValues?: Partial<T>;
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
 *
 * `T` is inferred from a decorated class passed to {@link DecorixVeeValidateModel}
 * (e.g. `toVeeValidate(SignupDto)` infers `T = SignupDto`), so `initialValues`
 * and `validate`/`validateAsync` are already typed — no separate form-values
 * type or cast needed.
 */
export type DecorixVeeValidateConfig<T = Record<string, unknown>> = {
    metadata: ModelMetadata;
    initialValues: Partial<T>;
    validationSchema: DecorixVeeValidateFieldSchema;
    fields: FieldMetadata[];
    validate(value: unknown): ValidationResult<T>;
    /** Async validation entry resolving async constraints; falls back to the sync result otherwise. */
    validateAsync(value: unknown): Promise<ValidationResult<T>>;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixVeeValidateModel<T = Record<string, unknown>> = ModelTarget<T> | ModelMetadata;
