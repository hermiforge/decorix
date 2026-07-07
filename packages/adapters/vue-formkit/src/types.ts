import type {FieldMetadata, ModelMetadata, ModelTarget, ValidationResult, ValidatorAdapterRef} from '@hermiforge-decorix/core';

/**
 * Options used by the FormKit adapter.
 */
export type DecorixFormKitOptions<T = Record<string, unknown>> = {
    initialValues?: Partial<T>;
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
 *
 * `T` is inferred from a decorated class passed to {@link DecorixFormKitModel}
 * (e.g. `toFormKit(SignupDto)` infers `T = SignupDto`), so `initialValues`
 * and `validate`/`validateAsync` are already typed — no separate form-values
 * type or cast needed.
 */
export type DecorixFormKitConfig<T = Record<string, unknown>> = {
    metadata: ModelMetadata;
    initialValues: Partial<T>;
    schema: DecorixFormKitField[];
    validate?: (value: unknown) => ValidationResult<T>;
    /** Async validation entry resolving async constraints; falls back to the sync result otherwise. */
    validateAsync?: (value: unknown) => Promise<ValidationResult<T>>;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixFormKitModel<T = Record<string, unknown>> = ModelTarget<T> | ModelMetadata;
