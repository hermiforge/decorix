import type {FieldMetadata, ModelMetadata, ModelTarget, ValidatorAdapterRef} from '@hermiforge-decorix/core';

/**
 * Options used by the React Hook Form adapter.
 */
export type DecorixReactHookFormOptions<T = Record<string, unknown>> = {
    defaultValues?: Partial<T>;
    validator?: ValidatorAdapterRef;
};

/**
 * Field rule summary generated for React Hook Form.
 */
export type DecorixReactHookFieldRule<T = Record<string, unknown>> = {
    name: Extract<keyof T, string>;
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
 *
 * `T` is inferred from a decorated class passed to {@link DecorixReactHookFormModel}
 * (e.g. `toReactHookForm(SignupDto)` infers `T = SignupDto`), so `defaultValues`
 * and `resolver` are already typed for `useForm<T>` — no separate form-values
 * type or cast needed.
 */
export type DecorixReactHookFormConfig<T = Record<string, unknown>> = {
    metadata: ModelMetadata;
    defaultValues: Partial<T>;
    fields: DecorixReactHookFieldRule<T>[];
    resolver(values: unknown): Promise<{ values: T; errors: Record<string, DecorixReactHookFieldError> }>;
};

/**
 * Registered model class or raw Decorix metadata accepted by the adapter.
 */
export type DecorixReactHookFormModel<T = Record<string, unknown>> = ModelTarget<T> | ModelMetadata;
